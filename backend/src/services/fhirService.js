const logger = require('../utils/logger');

/**
 * Build FHIR R4 Patient resource from User + PatientProfile
 */
const buildFHIRPatient = (user, profile) => {
  return {
    resourceType: 'Patient',
    id: user._id.toString(),
    meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
    identifier: [{ system: 'urn:medcds:patient', value: user._id.toString() }],
    active: user.isActive,
    name: [{ use: 'official', family: user.lastName, given: [user.firstName] }],
    telecom: [{ system: 'email', value: user.email }],
    gender: user.gender === 'male' ? 'male' : user.gender === 'female' ? 'female' : 'other',
    birthDate: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : undefined,
  };
};

/**
 * Build FHIR AllergyIntolerance resources
 */
const buildFHIRAllergies = (allergies, patientId) => {
  return allergies.map(allergy => ({
    resourceType: 'AllergyIntolerance',
    patient: { reference: `Patient/${patientId}` },
    clinicalStatus: { coding: [{ code: 'active' }] },
    verificationStatus: { coding: [{ code: 'confirmed' }] },
    type: allergy.type === 'drug' ? 'medication' : 'allergy',
    criticality: allergy.severity === 'life-threatening' ? 'high' :
                 allergy.severity === 'severe' ? 'high' : 'low',
    code: { text: allergy.substance },
    reaction: allergy.reaction ? [{ manifestation: [{ text: allergy.reaction }] }] : [],
  }));
};

/**
 * Build FHIR MedicationRequest resources
 */
const buildFHIRMedications = (medications, patientId) => {
  return medications.map(med => ({
    resourceType: 'MedicationRequest',
    status: med.active ? 'active' : 'stopped',
    intent: 'order',
    medicationCodeableConcept: { text: med.name },
    subject: { reference: `Patient/${patientId}` },
    dosageInstruction: [{
      text: med.dosage,
      timing: { repeat: { frequency: 1 } },
    }],
  }));
};

/**
 * Build FHIR Condition resources
 */
const buildFHIRConditions = (conditions, patientId) => {
  return conditions.map(cond => ({
    resourceType: 'Condition',
    clinicalStatus: { 
      coding: [{ code: cond.status === 'resolved' ? 'resolved' : 'active' }] 
    },
    subject: { reference: `Patient/${patientId}` },
    code: {
      coding: cond.icdCode ? [{ system: 'http://hl7.org/fhir/sid/icd-10', code: cond.icdCode }] : [],
      text: cond.name,
    },
    onsetDateTime: cond.diagnosedDate?.toISOString(),
  }));
};

/**
 * Build complete FHIR Bundle for a patient
 */
const buildFHIRBundle = (user, profile) => {
  const patientId = user._id.toString();
  const entries = [];

  // Patient resource
  entries.push({
    resource: buildFHIRPatient(user, profile),
    request: { method: 'PUT', url: `Patient/${patientId}` },
  });

  // Allergies
  if (profile?.allergies?.length) {
    buildFHIRAllergies(profile.allergies, patientId).forEach(resource => {
      entries.push({ resource, request: { method: 'POST', url: 'AllergyIntolerance' } });
    });
  }

  // Current medications
  if (profile?.currentMedications?.length) {
    buildFHIRMedications(profile.currentMedications.filter(m => m.active), patientId).forEach(resource => {
      entries.push({ resource, request: { method: 'POST', url: 'MedicationRequest' } });
    });
  }

  // Conditions
  if (profile?.conditions?.length) {
    buildFHIRConditions(profile.conditions, patientId).forEach(resource => {
      entries.push({ resource, request: { method: 'POST', url: 'Condition' } });
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    timestamp: new Date().toISOString(),
    entry: entries,
  };
};

/**
 * Convert FHIR DiagnosticReport to internal lab result format
 */
const parseFHIRDiagnosticReport = (fhirReport) => {
  const results = [];
  
  if (fhirReport?.result) {
    for (const obs of fhirReport.result) {
      if (obs.resource?.resourceType === 'Observation') {
        results.push({
          testName: obs.resource.code?.text || obs.resource.code?.coding?.[0]?.display,
          value: obs.resource.valueQuantity?.value || obs.resource.valueString,
          unit: obs.resource.valueQuantity?.unit,
          referenceRange: obs.resource.referenceRange?.[0]?.text,
          abnormal: obs.resource.interpretation?.[0]?.coding?.[0]?.code !== 'N',
        });
      }
    }
  }
  
  return results;
};

module.exports = {
  buildFHIRPatient,
  buildFHIRAllergies,
  buildFHIRMedications,
  buildFHIRConditions,
  buildFHIRBundle,
  parseFHIRDiagnosticReport,
};

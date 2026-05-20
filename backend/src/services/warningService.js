/**
 * MISSING DATA WARNING GENERATOR
 * Identifies incomplete patient data and warns about its impact on accuracy
 */

const generateMissingDataWarnings = (patientProfile, assessment) => {
  const warnings = [];

  if (!patientProfile) {
    warnings.push({
      field: 'patient_profile',
      message: 'No patient profile found. Assessment accuracy is severely limited.',
      impact: 'Drug safety checks cannot be performed without patient history.',
      severity: 'high',
    });
    return warnings;
  }

  // Allergy data
  if (!patientProfile.allergies || patientProfile.allergies.length === 0) {
    warnings.push({
      field: 'allergies',
      message: 'No allergy information recorded.',
      impact: 'Drug allergy checks have been skipped. There may be undocumented allergy risks.',
      severity: 'high',
    });
  }

  // Current medications
  if (!patientProfile.currentMedications || patientProfile.currentMedications.length === 0) {
    warnings.push({
      field: 'current_medications',
      message: 'No current medications recorded.',
      impact: 'Drug-drug interaction checks could not be fully performed.',
      severity: 'medium',
    });
  }

  // Past medical conditions
  if (!patientProfile.conditions || patientProfile.conditions.length === 0) {
    warnings.push({
      field: 'medical_conditions',
      message: 'No past or current medical conditions documented.',
      impact: 'Disease-drug contraindication rules may not be fully applied.',
      severity: 'medium',
    });
  }

  // Vital signs
  if (!patientProfile.vitalSigns || patientProfile.vitalSigns.length === 0) {
    warnings.push({
      field: 'vital_signs',
      message: 'No vital signs recorded.',
      impact: 'Dosage recommendations may not account for weight, renal function indicators, or blood pressure.',
      severity: 'medium',
    });
  } else {
    const latest = patientProfile.vitalSigns[patientProfile.vitalSigns.length - 1];
    if (!latest.weight?.value) {
      warnings.push({
        field: 'body_weight',
        message: 'Patient weight not recorded.',
        impact: 'Weight-based dosing cannot be calculated.',
        severity: 'low',
      });
    }
    if (!latest.bloodPressureSystolic) {
      warnings.push({
        field: 'blood_pressure',
        message: 'Blood pressure not recorded.',
        impact: 'Antihypertensive decisions and cardiovascular risk assessment are limited.',
        severity: 'medium',
      });
    }
  }

  // Lab results
  if (!assessment.labResults || assessment.labResults.length === 0) {
    warnings.push({
      field: 'lab_results',
      message: 'No lab reports provided.',
      impact: 'Renal function (creatinine/eGFR), liver function, and metabolic markers cannot be assessed. Certain drugs may need dose adjustment.',
      severity: 'high',
    });
  } else {
    const labNames = assessment.labResults.map(l => l.testName?.toLowerCase() || '');
    
    if (!labNames.some(n => n.includes('creatinine') || n.includes('egfr') || n.includes('kidney'))) {
      warnings.push({
        field: 'renal_function',
        message: 'Renal function labs (creatinine/eGFR) not provided.',
        impact: 'Cannot assess safety of renally-cleared drugs (e.g., Metformin, NSAIDs).',
        severity: 'high',
      });
    }
    
    if (!labNames.some(n => n.includes('liver') || n.includes('alt') || n.includes('ast') || n.includes('bilirubin'))) {
      warnings.push({
        field: 'liver_function',
        message: 'Liver function tests not provided.',
        impact: 'Cannot assess safety of hepatically-metabolized drugs.',
        severity: 'medium',
      });
    }
    
    if (!labNames.some(n => n.includes('glucose') || n.includes('hba1c') || n.includes('blood sugar'))) {
      warnings.push({
        field: 'blood_glucose',
        message: 'Blood glucose / HbA1c not provided.',
        impact: 'Diabetes management decisions are based on symptom assessment only.',
        severity: 'medium',
      });
    }
  }

  // Family history
  if (!patientProfile.familyHistory || patientProfile.familyHistory.length === 0) {
    warnings.push({
      field: 'family_history',
      message: 'Family history not recorded.',
      impact: 'Hereditary risk factors (e.g., familial hypercholesterolaemia, diabetes) may be missed.',
      severity: 'low',
    });
  }

  // Blood type
  if (!patientProfile.bloodType || patientProfile.bloodType === 'unknown') {
    warnings.push({
      field: 'blood_type',
      message: 'Blood type not recorded.',
      impact: 'Not critical for medication recommendations but required for surgical planning.',
      severity: 'low',
    });
  }

  // Smoking status
  if (!patientProfile.smokingStatus || patientProfile.smokingStatus === 'unknown') {
    warnings.push({
      field: 'smoking_status',
      message: 'Smoking status not recorded.',
      impact: 'Smoking affects drug metabolism and disease risk stratification.',
      severity: 'low',
    });
  }

  // Pregnancy status for female patients
  const gender = assessment.snapshotGender;
  if (gender === 'female') {
    const hasPregnancyInfo = patientProfile.conditions?.some(c => /pregnan/i.test(c.name));
    if (!hasPregnancyInfo) {
      warnings.push({
        field: 'pregnancy_status',
        message: 'Pregnancy status not recorded for female patient.',
        impact: 'Several drugs are teratogenic or contraindicated in pregnancy. Clinical assessment must confirm pregnancy status.',
        severity: 'high',
      });
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
};

module.exports = { generateMissingDataWarnings };

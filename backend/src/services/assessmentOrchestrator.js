const Assessment = require('../models/Assessment');
const PatientProfile = require('../models/PatientProfile');
const Report = require('../models/Report');
const User = require('../models/User');

const infermedicaService = require('./infermedicaService');
const isabelService = require('./isabelService');
const drugService = require('./drugService');
const safetyFilterService = require('./safetyFilterService');
const guidelineEngine = require('./guidelineEngine');
const aiService = require('./aiService');
const fhirService = require('./fhirService');
const warningService = require('./warningService');
const pdfService = require('./pdfService');
const logger = require('../utils/logger');

const MONITORING_MAP = {
  metformin: ['Renal function (eGFR)', 'Vitamin B12 levels'],
  warfarin: ['INR / PT', 'Signs of bleeding'],
  lisinopril: ['Blood pressure', 'Potassium levels', 'Renal function'],
  amlodipine: ['Blood pressure', 'Ankle oedema'],
  atorvastatin: ['Liver function tests', 'CK if muscle pain'],
  simvastatin: ['Liver function tests', 'CK if muscle pain'],
  glipizide: ['Blood glucose', 'HbA1c'],
  sitagliptin: ['Renal function', 'Pancreatitis signs'],
  paracetamol: ['Liver function if prolonged use'],
  ibuprofen: ['Renal function', 'GI symptoms', 'Blood pressure'],
  oseltamivir: ['Neuropsychiatric symptoms (rare)'],
  hydrochlorothiazide: ['Electrolytes', 'Blood pressure', 'Blood glucose'],
  amoxicillin: ['Signs of allergic reaction', 'Resolution of infection'],
};

const buildMonitoringList = (drugName) => {
  const key = drugName.toLowerCase();
  for (const [drug, monitoring] of Object.entries(MONITORING_MAP)) {
    if (key.includes(drug)) return monitoring;
  }
  return [];
};

const calculateSafetyScore = (enrichedData) => {
  let score = 10;
  if (enrichedData.fdaInfo?.boxedWarning) score -= 3;
  if (enrichedData.adverseEvents?.length > 10) score -= 1.5;
  else if (enrichedData.adverseEvents?.length > 5) score -= 0.5;
  if (enrichedData.fdaInfo?.warnings) score -= 0.5;
  if (enrichedData.knownInteractions?.length > 5) score -= 0.5;
  return Math.max(1, Math.round(score * 10) / 10);
};

/**
 * MAIN ASSESSMENT ORCHESTRATOR
 * All 8 clinical decision support steps
 */
const runAssessment = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw new Error('Assessment not found');

  assessment.processingStarted = new Date();
  assessment.status = 'processing';
  await assessment.save();

  try {
    const [user, patientProfile] = await Promise.all([
      User.findById(assessment.userId),
      PatientProfile.findOne({ userId: assessment.userId }),
    ]);

    const patientContext = {
      age: assessment.snapshotAge || user?.age,
      gender: assessment.snapshotGender || user?.gender,
      allergies: patientProfile?.allergies || [],
      currentMedications: patientProfile?.currentMedications?.filter(m => m.active) || [],
      conditions: patientProfile?.conditions || [],
    };

    logger.info(`[${assessmentId}] Step 1: Input ready. Age:${patientContext.age} Gender:${patientContext.gender}`);

    // ===== STEP 2: Disease Prediction =====
    const [infermedicaResult, isabelResult] = await Promise.allSettled([
      infermedicaService.getDiagnosis({ symptoms: assessment.symptoms, age: patientContext.age, gender: patientContext.gender }),
      isabelService.getDiagnosis({ symptoms: assessment.symptoms, age: patientContext.age, gender: patientContext.gender }),
    ]);

    const infermedicaDiseases = infermedicaResult.status === 'fulfilled' ? infermedicaResult.value : [];
    const isabelDiseases = isabelResult.status === 'fulfilled' ? isabelResult.value : [];
    const mergedDiseases = isabelService.mergeDiseasePredictions(infermedicaDiseases, isabelDiseases);

    assessment.predictedDiseases = mergedDiseases;
    assessment.primaryDiagnosis = mergedDiseases[0]?.name;
    assessment.apisUsed = ['claude-ai'];
    logger.info(`[${assessmentId}] Step 2: ${mergedDiseases.length} diseases predicted`);

    // ===== STEP 3: Guideline Engine =====
    const { recommendedDrugs, guidelineAvoidedDrugs, appliedGuidelines } =
      await guidelineEngine.applyGuidelines(patientProfile, mergedDiseases, assessment);
    assessment.guidelinesApplied = appliedGuidelines;
    logger.info(`[${assessmentId}] Step 3: ${appliedGuidelines.length} guidelines, ${recommendedDrugs.length} candidates`);

    // ===== STEP 4: Drug Enrichment =====
    const enrichedDrugs = await Promise.all(
      recommendedDrugs.map(async (drug) => {
        const enriched = await drugService.enrichDrugData(drug.name).catch(() => ({}));
        return {
          ...drug,
          rxcui: enriched.rxcui || drug.rxcui,
          drugClass: enriched.drugClass || drug.drugClass,
          brandNames: enriched.fdaInfo?.brandName ? [enriched.fdaInfo.brandName] : [],
          sideEffects: enriched.adverseEvents?.slice(0, 5).map(e => e.reaction) || [],
          warnings: enriched.fdaInfo?.warnings ? [enriched.fdaInfo.warnings.slice(0, 120)] : [],
          dosageRecommendation: { ...drug.dosageRecommendation, notes: enriched.fdaInfo?.dosage?.slice(0, 200) },
          safetyScore: calculateSafetyScore(enriched),
          monitoringRequired: buildMonitoringList(drug.name),
        };
      })
    );
    assessment.apisUsed = [...new Set([...assessment.apisUsed, 'openfda', 'rxnorm', 'dailymed'])];
    logger.info(`[${assessmentId}] Step 4: Drug data enriched`);

    // ===== STEP 5: Safety Filter =====
    const { safeDrugs, avoidedDrugs: safetyAvoidedDrugs } =
      await safetyFilterService.applySafetyFilters(enrichedDrugs, patientContext);

    const avoidedMap = new Map();
    for (const d of [...safetyAvoidedDrugs, ...guidelineAvoidedDrugs.map(d => ({
      name: d.name, genericName: d.genericName, rxcui: d.rxcui,
      avoidanceReasons: [{ type: 'contraindication', detail: d.reason, severity: 'contraindicated' }],
    }))]) {
      if (!avoidedMap.has(d.name.toLowerCase())) avoidedMap.set(d.name.toLowerCase(), d);
    }
    assessment.avoidedDrugs = Array.from(avoidedMap.values());
    logger.info(`[${assessmentId}] Step 5: ${safetyAvoidedDrugs.length} removed by safety engine`);

    // ===== STEP 6: Minimal Drug Engine =====
    assessment.suggestedDrugs = guidelineEngine.minimizeDrugs(safeDrugs, 4);
    logger.info(`[${assessmentId}] Step 6: ${assessment.suggestedDrugs.length} drugs final (max 4)`);

    // ===== STEP 7: Explanations =====
    assessment.missingDataWarnings = warningService.generateMissingDataWarnings(patientProfile, assessment);
    assessment.safetyFlags = buildSafetyFlags(assessment);
    assessment.clinicalSummary = await aiService.generateClinicalSummary({
      age: patientContext.age, gender: patientContext.gender,
      chiefComplaint: assessment.chiefComplaint, symptoms: assessment.symptoms,
      predictedDiseases: mergedDiseases, suggestedDrugs: assessment.suggestedDrugs,
      avoidedDrugs: Array.from(avoidedMap.values()),
      allergies: patientContext.allergies.map(a => a.substance || a),
      currentMeds: patientContext.currentMedications.map(m => m.name || m),
    });
    assessment.overallConfidence = guidelineEngine.calculateOverallConfidence(mergedDiseases, patientProfile);

    if (user && patientProfile) {
      patientProfile.fhirBundle = fhirService.buildFHIRBundle(user, patientProfile);
      await patientProfile.save().catch(() => {});
    }
    assessment.apisUsed = [...new Set([...assessment.apisUsed, 'claude-ai'])];
    logger.info(`[${assessmentId}] Step 7: Explanations complete`);

    // ===== STEP 8: PDF Report =====
    const reportId = `RPT-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const reportData = {
      reportId, assessmentId: assessment._id,
      patientName: user ? `${user.firstName} ${user.lastName}` : 'Patient',
      patientAge: patientContext.age, patientGender: patientContext.gender,
      assessmentNumber: assessment.assessmentNumber, reportDate: new Date(),
      chiefComplaint: assessment.chiefComplaint, symptoms: assessment.symptoms,
      predictedDiseases: mergedDiseases, suggestedDrugs: assessment.suggestedDrugs,
      avoidedDrugs: Array.from(avoidedMap.values()),
      clinicalSummary: assessment.clinicalSummary,
      missingDataWarnings: assessment.missingDataWarnings, safetyFlags: assessment.safetyFlags,
      guidelinesApplied: appliedGuidelines, overallConfidence: assessment.overallConfidence,
      snapshotAllergies: patientContext.allergies.map(a => a.substance || a),
      snapshotCurrentMeds: patientContext.currentMedications.map(m => m.name || m),
      snapshotConditions: patientContext.conditions.map(c => c.name || c),
      disclaimer: 'This report is generated by an AI-assisted Clinical Decision Support System and is NOT a prescription. It is intended to support, not replace, professional medical judgment. Always consult a qualified healthcare provider before making any medical decisions.',
    };

    const pdfResult = await pdfService.generateReport(reportData);
    const report = await Report.create({
      reportId, assessmentId: assessment._id, userId: assessment.userId,
      patientName: reportData.patientName, patientAge: reportData.patientAge,
      patientGender: reportData.patientGender, reportDate: reportData.reportDate,
      summary: {
        chiefComplaint: assessment.chiefComplaint,
        topDiagnosis: mergedDiseases[0]?.name,
        diagnosisConfidence: mergedDiseases[0]?.confidenceScore,
        drugsRecommended: assessment.suggestedDrugs.length,
        drugsAvoided: avoidedMap.size,
        warningCount: assessment.missingDataWarnings.length,
        overallRiskLevel: assessment.safetyFlags.length > 0 ? 'high' : assessment.missingDataWarnings.filter(w => w.severity === 'high').length > 1 ? 'high' : 'moderate',
      },
      pdfPath: pdfResult.path, pdfSize: pdfResult.size,
    });

    assessment.reportGenerated = true;
    assessment.reportPath = pdfResult.path;
    assessment.reportId = reportId;
    assessment.status = 'completed';
    assessment.processingCompleted = new Date();
    await assessment.save();

    logger.info(`[${assessmentId}] ✅ Done in ${assessment.processingCompleted - assessment.processingStarted}ms. Report: ${reportId}`);
    return { assessment, report };

  } catch (error) {
    logger.error(`[${assessmentId}] ❌ Failed: ${error.message}`);
    assessment.status = 'failed';
    assessment.processingErrors = [...(assessment.processingErrors || []), error.message];
    await assessment.save();
    throw error;
  }
};

const buildSafetyFlags = (assessment) => {
  const flags = [];
  const highWarnings = assessment.missingDataWarnings.filter(w => w.severity === 'high').length;
  if (highWarnings >= 2) flags.push({ flag: 'Critical Data Missing', details: `${highWarnings} high-severity data gaps. Accuracy limited.`, severity: 'high' });
  if (assessment.avoidedDrugs.some(d => d.avoidanceReasons?.some(r => r.type === 'allergy')))
    flags.push({ flag: 'Allergy Alert', details: 'Medications excluded due to documented allergies.', severity: 'critical' });
  if (assessment.avoidedDrugs.some(d => d.avoidanceReasons?.some(r => r.type === 'drug_interaction')))
    flags.push({ flag: 'Drug Interaction Detected', details: 'Potential interactions found and drugs excluded.', severity: 'high' });
  if (assessment.avoidedDrugs.some(d => d.avoidanceReasons?.some(r => r.type === 'contraindication')))
    flags.push({ flag: 'Disease Contraindication', details: 'Drugs excluded due to disease-specific contraindications.', severity: 'high' });
  return flags;
};

module.exports = { runAssessment };

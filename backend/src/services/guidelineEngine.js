const GuidelineRule = require('../models/GuidelineRule');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * CLINICAL GUIDELINE ENGINE
 * Matches diseases to recommended/avoided drugs based on structured guidelines
 */

/**
 * Evaluate a single condition trigger against patient context
 */
const evaluateCondition = (trigger, patientContext) => {
  const { field, operator, value } = trigger;
  const fieldValue = patientContext[field];

  if (fieldValue === undefined || fieldValue === null) return false;

  switch (operator) {
    case 'equals':
      return String(fieldValue).toLowerCase() === String(value).toLowerCase();
    case 'not_equals':
      return String(fieldValue).toLowerCase() !== String(value).toLowerCase();
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => String(v).toLowerCase().includes(String(value).toLowerCase()));
      }
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'gte':
      return Number(fieldValue) >= Number(value);
    case 'lte':
      return Number(fieldValue) <= Number(value);
    case 'exists':
      return Array.isArray(fieldValue) ? fieldValue.length > 0 : !!fieldValue;
    default:
      return false;
  }
};

/**
 * Check if a rule applies to given patient context
 */
const ruleApplies = (rule, patientContext) => {
  // ALL conditions must be true
  if (rule.conditions?.length > 0) {
    const allMet = rule.conditions.every(cond => evaluateCondition(cond, patientContext));
    if (!allMet) return false;
  }

  // At least ONE of anyOfConditions must be true
  if (rule.anyOfConditions?.length > 0) {
    const anyMet = rule.anyOfConditions.some(cond => evaluateCondition(cond, patientContext));
    if (!anyMet) return false;
  }

  return true;
};

/**
 * Build patient context for rule evaluation
 */
const buildPatientContext = (patientProfile, diseases, assessment) => {
  const conditions = patientProfile?.conditions?.map(c => c.name) || [];
  const diseaseNames = diseases.map(d => d.name);

  return {
    disease: diseaseNames[0], // Primary diagnosis
    diseases: diseaseNames,
    age: assessment.snapshotAge || patientProfile?.userId?.age,
    gender: assessment.snapshotGender || patientProfile?.userId?.gender,
    conditions: [...conditions, ...diseaseNames],
    allergies: patientProfile?.allergies?.map(a => a.substance) || [],
    currentMedications: patientProfile?.currentMedications?.filter(m => m.active).map(m => m.name) || [],
    kidneyImpairment: conditions.some(c => /kidney|renal|nephro/i.test(c)),
    liverImpairment: conditions.some(c => /liver|hepatic|cirrhosis/i.test(c)),
    heartFailure: conditions.some(c => /heart failure|cardiac failure/i.test(c)),
    diabetes: conditions.some(c => /diabetes|diabetic/i.test(c)) || diseaseNames.some(d => /diabetes/i.test(d)),
    hypertension: conditions.some(c => /hypertension|high blood pressure/i.test(c)) || diseaseNames.some(d => /hypertension/i.test(d)),
    asthma: conditions.some(c => /asthma/i.test(c)),
    pregnancy: conditions.some(c => /pregnan/i.test(c)),
    bloodType: patientProfile?.bloodType,
    smokingStatus: patientProfile?.smokingStatus,
  };
};

/**
 * Main: Apply guidelines to get drug recommendations and avoidances
 */
const applyGuidelines = async (patientProfile, diseases, assessment) => {
  const patientContext = buildPatientContext(patientProfile, diseases, assessment);

  // Fetch active rules from DB
  const cacheKey = `guidelines:all:active`;
  let rules = await cache.get(cacheKey);

  if (!rules) {
    rules = await GuidelineRule.find({ isActive: true }).sort({ priority: 1 }).lean();
    await cache.set(cacheKey, rules, 600); // 10-min cache
  }

  const recommendedDrugs = new Map(); // drug name -> details
  const avoidDrugs = new Map();
  const appliedGuidelines = [];

  for (const rule of rules) {
    if (!ruleApplies(rule, patientContext)) continue;

    appliedGuidelines.push(`${rule.source}: ${rule.name}`);
    logger.debug(`Guideline applied: ${rule.ruleId} - ${rule.name}`);

    for (const drugAction of (rule.drugActions || [])) {
      const key = drugAction.drugName.toLowerCase();

      if (['recommend', 'preferred', 'second_line'].includes(drugAction.action)) {
        if (!recommendedDrugs.has(key)) {
          recommendedDrugs.set(key, {
            name: drugAction.drugName,
            genericName: drugAction.genericName || drugAction.drugName,
            rxcui: drugAction.rxcui,
            isFirstLine: drugAction.action === 'recommend' || drugAction.action === 'preferred',
            priority: drugAction.priority || 5,
            whySuggested: [drugAction.reasoning || `Recommended by ${rule.source} guidelines for ${patientContext.disease || 'identified conditions'}`],
            guidelines: [`${rule.source}: ${rule.name}`],
            dosageRecommendation: drugAction.doseAdjustment ? { notes: drugAction.doseAdjustment } : {},
            targetDisease: patientContext.disease || diseases[0]?.name,
          });
        } else {
          const existing = recommendedDrugs.get(key);
          existing.guidelines.push(`${rule.source}: ${rule.name}`);
          if (drugAction.reasoning) existing.whySuggested.push(drugAction.reasoning);
        }
      }

      if (drugAction.action === 'avoid') {
        avoidDrugs.set(key, {
          name: drugAction.drugName,
          genericName: drugAction.genericName,
          rxcui: drugAction.rxcui,
          reason: drugAction.reasoning || `Avoided per ${rule.source} guidelines`,
          source: rule.source,
        });
      }
    }
  }

  return {
    recommendedDrugs: Array.from(recommendedDrugs.values()).sort((a, b) => a.priority - b.priority),
    guidelineAvoidedDrugs: Array.from(avoidDrugs.values()),
    appliedGuidelines,
    patientContext,
  };
};

/**
 * Minimal drug engine — keeps only first-line, removes duplicates, limits count
 */
const minimizeDrugs = (drugs, maxDrugs = 4) => {
  // Prioritize first-line drugs
  const firstLine = drugs.filter(d => d.isFirstLine);
  const secondLine = drugs.filter(d => !d.isFirstLine);

  // Merge, first-line first
  const ordered = [...firstLine, ...secondLine];

  // Remove duplicates by generic name
  const seen = new Set();
  const unique = ordered.filter(drug => {
    const key = (drug.genericName || drug.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Limit total drugs
  return unique.slice(0, maxDrugs);
};

/**
 * Calculate overall confidence score for the assessment
 */
const calculateOverallConfidence = (diseases, patientProfile) => {
  if (!diseases || diseases.length === 0) return 0.1;

  const topDiseaseScore = diseases[0]?.confidenceScore || 0;
  const dataCompletenessScore = calculateDataCompleteness(patientProfile);

  return Math.round((topDiseaseScore * 0.6 + dataCompletenessScore * 0.4) * 100) / 100;
};

const calculateDataCompleteness = (profile) => {
  if (!profile) return 0.2;

  let score = 0;
  const checks = [
    profile.allergies?.length > 0,
    profile.currentMedications !== undefined,
    profile.conditions?.length > 0 || profile.conditions !== undefined,
    profile.vitalSigns?.length > 0,
    profile.bloodType && profile.bloodType !== 'unknown',
    profile.smokingStatus && profile.smokingStatus !== 'unknown',
    profile.familyHistory?.length > 0,
  ];

  score = checks.filter(Boolean).length / checks.length;
  return score;
};

module.exports = {
  applyGuidelines,
  minimizeDrugs,
  calculateOverallConfidence,
  buildPatientContext,
};

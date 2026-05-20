const { getRxCUI, getDrugInteractions } = require('./drugService');
const logger = require('../utils/logger');

/**
 * SAFETY FILTER ENGINE
 * Removes unsafe drugs based on patient-specific factors.
 * This is the most critical component - it MUST err on the side of caution.
 */

/**
 * Check if a drug name matches any known allergy
 */
const checkAllergyConflict = (drugName, allergies) => {
  const drug = drugName.toLowerCase();
  
  for (const allergy of allergies) {
    const substance = allergy.substance?.toLowerCase() || allergy.toLowerCase?.() || '';
    
    // Direct name match
    if (drug.includes(substance) || substance.includes(drug)) {
      return {
        conflict: true,
        reason: `Patient has documented allergy to ${allergy.substance || allergy}`,
        severity: allergy.severity || 'unknown',
        type: 'allergy',
      };
    }
    
    // Cross-reactivity checks
    const crossReactivity = checkCrossReactivity(drug, substance);
    if (crossReactivity) return crossReactivity;
  }
  
  return { conflict: false };
};

/**
 * Known cross-reactivity groups
 */
const CROSS_REACTIVITY_GROUPS = {
  penicillins: ['amoxicillin', 'ampicillin', 'piperacillin', 'nafcillin', 'oxacillin', 'dicloxacillin'],
  cephalosporins: ['cephalexin', 'cefazolin', 'ceftriaxone', 'cefdinir', 'cefuroxime'],
  sulfonamides: ['sulfamethoxazole', 'sulfadiazine', 'sulfasalazine'],
  nsaids: ['ibuprofen', 'naproxen', 'aspirin', 'diclofenac', 'indomethacin', 'ketorolac'],
  statins: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'lovastatin', 'pravastatin'],
  fluoroquinolones: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'ofloxacin'],
};

const checkCrossReactivity = (drug, allergySubstance) => {
  for (const [className, members] of Object.entries(CROSS_REACTIVITY_GROUPS)) {
    const drugInGroup = members.some(m => drug.includes(m) || m.includes(drug));
    const allergyInGroup = members.some(m => allergySubstance.includes(m) || m.includes(allergySubstance));
    
    if (drugInGroup && allergyInGroup && drug !== allergySubstance) {
      return {
        conflict: true,
        reason: `Potential cross-reactivity with ${allergySubstance} allergy — both belong to ${className} class`,
        severity: 'moderate',
        type: 'cross_reactivity',
      };
    }
  }
  return null;
};

/**
 * Check drug-drug interactions against current medications
 */
const checkDrugInteractions = async (drugName, currentMedications) => {
  if (!currentMedications || currentMedications.length === 0) {
    return { conflict: false };
  }

  const interactions = [];

  // Known major interaction pairs (hard-coded for reliability)
  const KNOWN_MAJOR_INTERACTIONS = [
    { drugs: ['warfarin', 'aspirin'], severity: 'major', reason: 'Increased bleeding risk' },
    { drugs: ['warfarin', 'ibuprofen'], severity: 'major', reason: 'Increased bleeding risk' },
    { drugs: ['warfarin', 'naproxen'], severity: 'major', reason: 'Increased bleeding risk' },
    { drugs: ['metformin', 'contrast'], severity: 'contraindicated', reason: 'Risk of lactic acidosis' },
    { drugs: ['simvastatin', 'clarithromycin'], severity: 'major', reason: 'Rhabdomyolysis risk' },
    { drugs: ['simvastatin', 'erythromycin'], severity: 'major', reason: 'Rhabdomyolysis risk' },
    { drugs: ['maoi', 'ssri'], severity: 'contraindicated', reason: 'Serotonin syndrome risk' },
    { drugs: ['maoi', 'tramadol'], severity: 'contraindicated', reason: 'Serotonin syndrome risk' },
    { drugs: ['clopidogrel', 'omeprazole'], severity: 'moderate', reason: 'Reduced antiplatelet effect' },
    { drugs: ['lithium', 'nsaid'], severity: 'major', reason: 'Lithium toxicity risk' },
    { drugs: ['digoxin', 'amiodarone'], severity: 'major', reason: 'Digoxin toxicity' },
    { drugs: ['ace inhibitor', 'potassium'], severity: 'moderate', reason: 'Hyperkalemia risk' },
    { drugs: ['ssri', 'tramadol'], severity: 'major', reason: 'Serotonin syndrome risk' },
    { drugs: ['methotrexate', 'nsaid'], severity: 'major', reason: 'Methotrexate toxicity' },
    { drugs: ['theophylline', 'ciprofloxacin'], severity: 'major', reason: 'Theophylline toxicity' },
  ];

  const drugLower = drugName.toLowerCase();

  for (const med of currentMedications) {
    const medLower = (med.name || med).toLowerCase();
    
    for (const interaction of KNOWN_MAJOR_INTERACTIONS) {
      const [d1, d2] = interaction.drugs;
      const match = (drugLower.includes(d1) || d1.includes(drugLower)) &&
                    (medLower.includes(d2) || d2.includes(medLower));
      const matchReverse = (drugLower.includes(d2) || d2.includes(drugLower)) &&
                           (medLower.includes(d1) || d1.includes(medLower));
      
      if (match || matchReverse) {
        interactions.push({
          conflictingDrug: med.name || med,
          severity: interaction.severity,
          reason: interaction.reason,
        });
      }
    }
  }

  // Try RxNorm API for deeper interaction check
  try {
    const drugRxcui = await getRxCUI(drugName);
    const medRxcuis = await Promise.all(
      currentMedications.map(m => getRxCUI(m.name || m))
    );
    
    const validRxcuis = [drugRxcui, ...medRxcuis].filter(Boolean);
    
    if (validRxcuis.length >= 2) {
      const apiInteractions = await getDrugInteractions(validRxcuis);
      for (const interaction of apiInteractions) {
        if (interaction.severity === 'high' || interaction.severity === 'critical') {
          interactions.push({
            conflictingDrug: interaction.drug2,
            severity: interaction.severity,
            reason: interaction.description,
          });
        }
      }
    }
  } catch (err) {
    logger.warn(`RxNorm interaction check failed for ${drugName}: ${err.message}`);
  }

  if (interactions.length > 0) {
    return {
      conflict: true,
      interactions,
      type: 'drug_drug_interaction',
      reason: `Interactions with: ${interactions.map(i => i.conflictingDrug).join(', ')}`,
    };
  }

  return { conflict: false };
};

/**
 * Check disease-specific contraindications
 */
const checkDiseaseContraindications = (drugName, conditions) => {
  const drug = drugName.toLowerCase();
  const activeConditions = conditions.map(c => (c.name || c).toLowerCase());

  const DISEASE_DRUG_CONTRAINDICATIONS = [
    // Kidney disease
    { condition: 'kidney', drug: 'metformin', reason: 'Metformin contraindicated in significant renal impairment (risk of lactic acidosis)', severity: 'absolute_contraindication' },
    { condition: 'chronic kidney disease', drug: 'nsaid', reason: 'NSAIDs can worsen renal function', severity: 'contraindicated' },
    { condition: 'renal failure', drug: 'metformin', reason: 'Metformin contraindicated in renal failure', severity: 'absolute_contraindication' },
    // Liver disease
    { condition: 'liver', drug: 'paracetamol', reason: 'Paracetamol dose reduction required in hepatic impairment', severity: 'warning' },
    { condition: 'hepatic', drug: 'statins', reason: 'Statins contraindicated in active liver disease', severity: 'contraindicated' },
    { condition: 'liver cirrhosis', drug: 'metformin', reason: 'Metformin avoided in hepatic impairment', severity: 'contraindicated' },
    // Heart conditions
    { condition: 'heart failure', drug: 'nsaid', reason: 'NSAIDs can worsen heart failure and cause fluid retention', severity: 'contraindicated' },
    { condition: 'heart block', drug: 'beta blocker', reason: 'Beta blockers may worsen heart block', severity: 'warning' },
    // Respiratory
    { condition: 'asthma', drug: 'aspirin', reason: 'Aspirin can trigger bronchospasm in aspirin-sensitive asthma', severity: 'warning' },
    { condition: 'asthma', drug: 'nsaid', reason: 'NSAIDs may exacerbate asthma', severity: 'warning' },
    { condition: 'copd', drug: 'beta blocker', reason: 'Non-selective beta blockers may worsen bronchoconstriction in COPD', severity: 'warning' },
    // GI conditions
    { condition: 'peptic ulcer', drug: 'nsaid', reason: 'NSAIDs increase risk of GI bleeding in peptic ulcer disease', severity: 'contraindicated' },
    { condition: 'gerd', drug: 'nsaid', reason: 'NSAIDs may worsen GERD', severity: 'warning' },
    // Bleeding disorders
    { condition: 'bleeding', drug: 'aspirin', reason: 'Aspirin increases bleeding risk', severity: 'contraindicated' },
    { condition: 'coagulopathy', drug: 'warfarin', reason: 'Use with caution — requires close INR monitoring', severity: 'warning' },
    // Diabetes
    { condition: 'diabetes', drug: 'corticosteroid', reason: 'Corticosteroids can raise blood glucose levels', severity: 'warning' },
    // Pregnancy
    { condition: 'pregnancy', drug: 'nsaid', reason: 'NSAIDs contraindicated in third trimester of pregnancy', severity: 'contraindicated' },
    { condition: 'pregnancy', drug: 'warfarin', reason: 'Warfarin teratogenic — avoid in pregnancy', severity: 'absolute_contraindication' },
    { condition: 'pregnancy', drug: 'ace inhibitor', reason: 'ACE inhibitors contraindicated in pregnancy', severity: 'absolute_contraindication' },
  ];

  const conflicts = [];

  for (const rule of DISEASE_DRUG_CONTRAINDICATIONS) {
    const conditionMatch = activeConditions.some(c => c.includes(rule.condition) || rule.condition.includes(c));
    const drugMatch = drug.includes(rule.drug) || rule.drug.includes(drug);

    if (conditionMatch && drugMatch) {
      conflicts.push({
        condition: rule.condition,
        reason: rule.reason,
        severity: rule.severity,
      });
    }
  }

  if (conflicts.length > 0) {
    return {
      conflict: true,
      conflicts,
      type: 'disease_contraindication',
      reason: conflicts.map(c => c.reason).join('; '),
    };
  }

  return { conflict: false };
};

/**
 * Check if patient is already taking this drug
 */
const checkAlreadyTaking = (drugName, currentMedications) => {
  const drug = drugName.toLowerCase();
  const current = currentMedications.map(m => (m.name || m).toLowerCase());

  for (const med of current) {
    if (med.includes(drug) || drug.includes(med)) {
      return {
        conflict: true,
        reason: `Patient is already taking ${med}`,
        type: 'already_taking',
      };
    }
  }
  return { conflict: false };
};

/**
 * Age-based contraindication checks
 */
const checkAgeContraindications = (drugName, age) => {
  if (!age) return { conflict: false };

  const drug = drugName.toLowerCase();

  const AGE_RULES = [
    { drug: 'aspirin', maxAge: 18, reason: "Aspirin contraindicated in children under 18 (Reye's syndrome risk)" },
    { drug: 'metformin', minAge: 18, reason: 'Metformin not recommended under 18 outside specialist care' },
    { drug: 'fluoroquinolone', maxAge: 18, reason: 'Fluoroquinolones generally avoided in children (joint toxicity)' },
    { drug: 'ciprofloxacin', maxAge: 18, reason: 'Ciprofloxacin avoided in paediatric patients' },
    { drug: 'tetracycline', maxAge: 8, reason: 'Tetracyclines cause dental staining in children under 8' },
    { drug: 'doxycycline', maxAge: 8, reason: 'Doxycycline avoided in children under 8' },
  ];

  for (const rule of AGE_RULES) {
    if (!drug.includes(rule.drug) && !rule.drug.includes(drug)) continue;
    if (rule.maxAge && age < rule.maxAge) {
      return { conflict: true, reason: rule.reason, type: 'age_contraindicated' };
    }
    if (rule.minAge && age < rule.minAge) {
      return { conflict: true, reason: rule.reason, type: 'age_contraindicated' };
    }
  }

  return { conflict: false };
};

/**
 * MAIN SAFETY FILTER FUNCTION
 * Returns filtered safe drugs and list of avoided drugs with reasons
 */
const applySafetyFilters = async (candidateDrugs, patientContext) => {
  const {
    allergies = [],
    currentMedications = [],
    conditions = [],
    age,
    gender,
  } = patientContext;

  const safeDrugs = [];
  const avoidedDrugs = [];

  for (const drug of candidateDrugs) {
    const avoidanceReasons = [];
    let isSafe = true;

    // 1. Allergy check
    const allergyCheck = checkAllergyConflict(drug.name, allergies);
    if (allergyCheck.conflict) {
      isSafe = false;
      avoidanceReasons.push({
        type: 'allergy',
        detail: allergyCheck.reason,
        severity: 'absolute_contraindication',
      });
    }

    // 2. Drug-drug interactions
    const interactionCheck = await checkDrugInteractions(drug.name, currentMedications);
    if (interactionCheck.conflict) {
      isSafe = false;
      for (const interaction of (interactionCheck.interactions || [])) {
        avoidanceReasons.push({
          type: 'drug_interaction',
          detail: `${interaction.reason} (with ${interaction.conflictingDrug})`,
          severity: interaction.severity === 'contraindicated' ? 'contraindicated' : 'warning',
        });
      }
    }

    // 3. Disease contraindications
    const diseaseCheck = checkDiseaseContraindications(drug.name, conditions);
    if (diseaseCheck.conflict) {
      for (const c of (diseaseCheck.conflicts || [])) {
        if (c.severity === 'absolute_contraindication') isSafe = false;
        if (c.severity === 'contraindicated') isSafe = false;
        avoidanceReasons.push({
          type: 'contraindication',
          detail: c.reason,
          severity: c.severity,
        });
      }
    }

    // 4. Already taking
    const alreadyTaking = checkAlreadyTaking(drug.name, currentMedications);
    if (alreadyTaking.conflict) {
      isSafe = false;
      avoidanceReasons.push({
        type: 'already_taking',
        detail: alreadyTaking.reason,
        severity: 'warning',
      });
    }

    // 5. Age contraindications
    const ageCheck = checkAgeContraindications(drug.name, age);
    if (ageCheck.conflict) {
      isSafe = false;
      avoidanceReasons.push({
        type: 'age_contraindicated',
        detail: ageCheck.reason,
        severity: 'contraindicated',
      });
    }

    if (isSafe) {
      safeDrugs.push(drug);
    } else {
      avoidedDrugs.push({
        name: drug.name,
        genericName: drug.genericName,
        rxcui: drug.rxcui,
        avoidanceReasons,
      });
    }
  }

  return { safeDrugs, avoidedDrugs };
};

module.exports = {
  applySafetyFilters,
  checkAllergyConflict,
  checkDrugInteractions,
  checkDiseaseContraindications,
  checkAlreadyTaking,
  checkAgeContraindications,
};

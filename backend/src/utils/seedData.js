require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const GuidelineRule = require('../models/GuidelineRule');
const logger = require('./logger');

const GUIDELINE_RULES = [
  // ===== FEVER / URTI =====
  {
    ruleId: 'WHO-FEVER-001',
    name: 'Fever - First-line Antipyretic Therapy',
    description: 'WHO recommendation for fever management in adults',
    source: 'WHO',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'fever' }],
    drugActions: [
      { drugName: 'Paracetamol', genericName: 'Acetaminophen', action: 'preferred', priority: 1,
        reasoning: 'First-line antipyretic per WHO guidelines. Safest option for broad age range.' },
      { drugName: 'Ibuprofen', genericName: 'Ibuprofen', action: 'second_line', priority: 2,
        reasoning: 'NSAID antipyretic. Second-line to paracetamol; avoid in kidney disease, GI ulcer, and asthma.' },
    ],
    category: 'treatment', diseaseArea: ['fever', 'urti', 'viral infection'],
    isActive: true, priority: 1,
  },
  {
    ruleId: 'WHO-FEVER-002',
    name: 'Fever - Avoid Aspirin in Children',
    source: 'WHO',
    evidenceLevel: 'A',
    conditions: [
      { field: 'disease', operator: 'contains', value: 'fever' },
      { field: 'age', operator: 'lte', value: 18 },
    ],
    drugActions: [
      { drugName: 'Aspirin', action: 'avoid',
        reasoning: "Aspirin contraindicated in children with fever due to risk of Reye's syndrome." },
    ],
    category: 'contraindication', diseaseArea: ['fever'],
    isActive: true, priority: 1,
  },
  {
    ruleId: 'NICE-URTI-001',
    name: 'Upper Respiratory Tract Infection - Antibiotic Stewardship',
    source: 'NICE',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'respiratory' }],
    drugActions: [
      { drugName: 'Amoxicillin', genericName: 'Amoxicillin', action: 'second_line', priority: 3,
        reasoning: 'NICE recommends delayed/no antibiotic for most URTIs (viral). Use amoxicillin only if bacterial infection confirmed or high risk.' },
    ],
    category: 'treatment', diseaseArea: ['urti', 'respiratory infection'],
    isActive: true, priority: 2,
  },

  // ===== DIABETES =====
  {
    ruleId: 'ADA-DM2-001',
    name: 'Type 2 Diabetes - First-line Therapy',
    source: 'WHO',
    sourceVersion: 'ADA Standards 2023',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'diabetes' }],
    drugActions: [
      { drugName: 'Metformin', genericName: 'Metformin', action: 'preferred', priority: 1,
        reasoning: 'Metformin is the recommended first-line agent for type 2 diabetes per ADA/WHO guidelines. Reduces HbA1c by 1-2%, weight-neutral, low hypoglycaemia risk.' },
    ],
    category: 'treatment', diseaseArea: ['diabetes', 'type 2 diabetes'],
    isActive: true, priority: 1,
  },
  {
    ruleId: 'ADA-DM2-002',
    name: 'Type 2 Diabetes - Avoid Metformin in Kidney Disease',
    source: 'WHO',
    evidenceLevel: 'A',
    conditions: [
      { field: 'disease', operator: 'contains', value: 'diabetes' },
      { field: 'kidneyImpairment', operator: 'equals', value: true },
    ],
    drugActions: [
      { drugName: 'Metformin', action: 'avoid',
        reasoning: 'Metformin contraindicated with significant renal impairment (eGFR < 30 mL/min/1.73m²) due to risk of lactic acidosis.' },
    ],
    category: 'contraindication', diseaseArea: ['diabetes'],
    isActive: true, priority: 1,
  },
  {
    ruleId: 'ICMR-DM2-001',
    name: 'Type 2 Diabetes - ICMR India Guidelines',
    source: 'ICMR',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'diabetes' }],
    drugActions: [
      { drugName: 'Glipizide', genericName: 'Glipizide', action: 'second_line', priority: 2,
        reasoning: 'ICMR recommends sulfonylureas as second-line if Metformin alone insufficient. Glipizide preferred for shorter duration of action.' },
      { drugName: 'Sitagliptin', genericName: 'Sitagliptin', action: 'second_line', priority: 3,
        reasoning: 'DPP-4 inhibitor as add-on therapy per ICMR guidelines. Weight neutral, low hypoglycaemia risk.' },
    ],
    category: 'treatment', diseaseArea: ['diabetes'],
    isActive: true, priority: 2,
  },

  // ===== HYPERTENSION =====
  {
    ruleId: 'WHO-HTN-001',
    name: 'Hypertension - First-line Antihypertensive',
    source: 'WHO',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'hypertension' }],
    drugActions: [
      { drugName: 'Amlodipine', genericName: 'Amlodipine', action: 'preferred', priority: 1,
        reasoning: 'CCB Amlodipine recommended as first-line by WHO/ISH for uncomplicated hypertension. Well tolerated, once-daily dosing.' },
      { drugName: 'Lisinopril', genericName: 'Lisinopril', action: 'preferred', priority: 1,
        reasoning: 'ACE inhibitor, first-line especially in diabetes with hypertension or with CKD (renoprotective).' },
      { drugName: 'Hydrochlorothiazide', genericName: 'Hydrochlorothiazide', action: 'second_line', priority: 2,
        reasoning: 'Thiazide diuretic as first-line or add-on for hypertension per WHO guidelines.' },
    ],
    category: 'treatment', diseaseArea: ['hypertension', 'high blood pressure'],
    isActive: true, priority: 1,
  },
  {
    ruleId: 'NICE-HTN-002',
    name: 'Hypertension - Avoid NSAIDs',
    source: 'NICE',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'hypertension' }],
    drugActions: [
      { drugName: 'Ibuprofen', action: 'avoid',
        reasoning: 'NSAIDs can raise blood pressure and reduce effectiveness of antihypertensives.' },
      { drugName: 'Naproxen', action: 'avoid', reasoning: 'NSAIDs increase cardiovascular risk in hypertensive patients.' },
    ],
    category: 'contraindication', diseaseArea: ['hypertension'],
    isActive: true, priority: 2,
  },
  {
    ruleId: 'HTN-003',
    name: 'Hypertension in Diabetes - Preferred Agents',
    source: 'WHO',
    evidenceLevel: 'A',
    conditions: [
      { field: 'disease', operator: 'contains', value: 'hypertension' },
      { field: 'diabetes', operator: 'equals', value: true },
    ],
    drugActions: [
      { drugName: 'Lisinopril', genericName: 'Lisinopril', action: 'preferred', priority: 1,
        reasoning: 'ACE inhibitors are preferred in diabetic hypertension for renoprotective effects and CV risk reduction.' },
    ],
    category: 'treatment', diseaseArea: ['hypertension', 'diabetes'],
    isActive: true, priority: 1,
  },

  // ===== HEADACHE =====
  {
    ruleId: 'NICE-HA-001',
    name: 'Tension Headache - First-line Analgesia',
    source: 'NICE',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'headache' }],
    drugActions: [
      { drugName: 'Paracetamol', genericName: 'Acetaminophen', action: 'preferred', priority: 1,
        reasoning: 'NICE recommends paracetamol as first-line for tension headache. Effective, safe, minimal side effects.' },
      { drugName: 'Ibuprofen', genericName: 'Ibuprofen', action: 'second_line', priority: 2,
        reasoning: 'NSAID alternative for tension headache. Effective but avoid in patients with GI, renal, or cardiac conditions.' },
    ],
    category: 'treatment', diseaseArea: ['headache', 'tension headache', 'migraine'],
    isActive: true, priority: 1,
  },

  // ===== HEART FAILURE =====
  {
    ruleId: 'ESC-HF-001',
    name: 'Heart Failure - Avoid NSAIDs',
    source: 'NICE',
    evidenceLevel: 'A',
    conditions: [{ field: 'heartFailure', operator: 'equals', value: true }],
    drugActions: [
      { drugName: 'Ibuprofen', action: 'avoid',
        reasoning: 'NSAIDs contraindicated in heart failure — cause sodium retention, worsen cardiac function.' },
      { drugName: 'Naproxen', action: 'avoid', reasoning: 'NSAIDs worsen heart failure outcomes.' },
      { drugName: 'Diclofenac', action: 'avoid', reasoning: 'NSAIDs associated with increased heart failure hospitalisation.' },
    ],
    category: 'contraindication', diseaseArea: ['heart failure'],
    isActive: true, priority: 1,
  },

  // ===== ASTHMA =====
  {
    ruleId: 'GINA-ASTHMA-001',
    name: 'Asthma - Avoid Aspirin/NSAIDs',
    source: 'WHO',
    evidenceLevel: 'B',
    conditions: [{ field: 'asthma', operator: 'equals', value: true }],
    drugActions: [
      { drugName: 'Aspirin', action: 'avoid',
        reasoning: 'Aspirin can trigger bronchospasm in ~10-20% of patients with asthma (aspirin-exacerbated respiratory disease).' },
      { drugName: 'Ibuprofen', action: 'avoid',
        reasoning: 'NSAIDs may exacerbate asthma in sensitive patients. Paracetamol is preferred.' },
    ],
    category: 'contraindication', diseaseArea: ['asthma'],
    isActive: true, priority: 1,
  },

  // ===== PREGNANCY =====
  {
    ruleId: 'WHO-PREG-001',
    name: 'Pregnancy - Drug Safety',
    source: 'WHO',
    evidenceLevel: 'A',
    conditions: [{ field: 'pregnancy', operator: 'equals', value: true }],
    drugActions: [
      { drugName: 'Ibuprofen', action: 'avoid',
        reasoning: 'NSAIDs contraindicated in third trimester; associated with premature closure of ductus arteriosus.' },
      { drugName: 'Naproxen', action: 'avoid', reasoning: 'NSAIDs contraindicated in pregnancy.' },
      { drugName: 'Warfarin', action: 'avoid', reasoning: 'Warfarin is teratogenic — absolute contraindication in first trimester.' },
      { drugName: 'Lisinopril', action: 'avoid',
        reasoning: 'ACE inhibitors contraindicated in pregnancy — cause fetal renal toxicity.' },
      { drugName: 'Metformin', action: 'avoid',
        reasoning: 'Limited safety data; consult specialist. Insulin preferred for gestational diabetes.' },
    ],
    category: 'contraindication', diseaseArea: ['pregnancy'],
    isActive: true, priority: 1,
  },

  // ===== PEPTIC ULCER =====
  {
    ruleId: 'NICE-PUD-001',
    name: 'Peptic Ulcer Disease - Avoid NSAIDs',
    source: 'NICE',
    evidenceLevel: 'A',
    conditions: [{ field: 'conditions', operator: 'contains', value: 'peptic ulcer' }],
    drugActions: [
      { drugName: 'Ibuprofen', action: 'avoid',
        reasoning: 'NSAIDs inhibit prostaglandins, increasing gastric acid secretion and worsening peptic ulcer.' },
      { drugName: 'Aspirin', action: 'avoid',
        reasoning: 'Aspirin directly damages gastric mucosa and increases bleeding risk in peptic ulcer disease.' },
      { drugName: 'Naproxen', action: 'avoid', reasoning: 'NSAIDs contraindicated in peptic ulcer disease.' },
    ],
    category: 'contraindication', diseaseArea: ['peptic ulcer'],
    isActive: true, priority: 1,
  },

  // ===== INFLUENZA =====
  {
    ruleId: 'WHO-FLU-001',
    name: 'Influenza - Symptomatic Management',
    source: 'WHO',
    evidenceLevel: 'A',
    conditions: [{ field: 'disease', operator: 'contains', value: 'influenza' }],
    drugActions: [
      { drugName: 'Paracetamol', genericName: 'Acetaminophen', action: 'preferred', priority: 1,
        reasoning: 'WHO recommends paracetamol for fever and myalgia in influenza. No proven role for antibiotics in uncomplicated flu.' },
      { drugName: 'Oseltamivir', genericName: 'Oseltamivir', action: 'second_line', priority: 2,
        reasoning: 'Antivirals (e.g., Oseltamivir) considered for high-risk patients within 48h of symptom onset per WHO.' },
    ],
    category: 'treatment', diseaseArea: ['influenza', 'flu'],
    isActive: true, priority: 1,
  },
];

const seedGuidelines = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medcds');
    logger.info('Connected to MongoDB for seeding');

    // Clear existing rules
    await GuidelineRule.deleteMany({});
    logger.info('Cleared existing guideline rules');

    // Insert new rules
    await GuidelineRule.insertMany(GUIDELINE_RULES);
    logger.info(`Seeded ${GUIDELINE_RULES.length} clinical guideline rules`);

    await mongoose.connection.close();
    logger.info('Seeding complete');
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedGuidelines();

const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: String }, // Infermedica symptom ID
  severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
  duration: { type: String },
  durationUnit: { type: String, enum: ['hours', 'days', 'weeks', 'months'] },
  onset: { type: String, enum: ['sudden', 'gradual'] },
  present: { type: Boolean, default: true },
});

const predictedDiseaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: String },
  icdCode: { type: String },
  confidenceScore: { type: Number, min: 0, max: 1 },
  confidenceLevel: { type: String, enum: ['low', 'moderate', 'high', 'very_high'] },
  source: { type: String, enum: ['infermedica', 'isabel', 'merged', 'ai'] },
  description: { type: String },
  prevalence: { type: String },
  urgencyLevel: { type: String, enum: ['routine', 'soon', 'urgent', 'emergency'] },
});

const suggestedDrugSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String },
  brandNames: [String],
  rxcui: { type: String },
  drugClass: { type: String },
  indication: { type: String },
  targetDisease: { type: String },
  dosageRecommendation: {
    dose: String,
    frequency: String,
    route: String,
    duration: String,
    notes: String,
  },
  safetyScore: { type: Number, min: 0, max: 10 },
  isFirstLine: { type: Boolean, default: true },
  whySuggested: [String],
  sideEffects: [String],
  warnings: [String],
  monitoringRequired: [String],
  guidelines: [String], // Which guidelines recommend this
});

const avoidedDrugSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String },
  rxcui: { type: String },
  avoidanceReasons: [{
    type: { 
      type: String, 
      enum: ['allergy', 'drug_interaction', 'contraindication', 'already_taking', 'kidney_impairment', 'liver_impairment', 'age_contraindicated', 'pregnancy', 'other'] 
    },
    detail: String,
    severity: { type: String, enum: ['warning', 'contraindicated', 'absolute_contraindication'] },
  }],
  alternativeExists: { type: Boolean, default: true },
});

const labResultSchema = new mongoose.Schema({
  testName: { type: String },
  value: mongoose.Schema.Types.Mixed,
  unit: { type: String },
  referenceRange: { type: String },
  abnormal: { type: Boolean },
  notes: { type: String },
  extractedByAI: { type: Boolean, default: false },
});

const assessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  patientProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientProfile',
  },
  assessmentNumber: { type: Number },
  
  // Input Layer
  chiefComplaint: { type: String },
  symptoms: [symptomSchema],
  additionalNotes: { type: String },
  labResults: [labResultSchema],
  uploadedReports: [{ 
    filename: String, 
    path: String, 
    extractedText: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Context at time of assessment
  snapshotAge: { type: Number },
  snapshotGender: { type: String },
  snapshotAllergies: [String],
  snapshotCurrentMeds: [String],
  snapshotConditions: [String],
  
  // Step 2: Disease Prediction
  predictedDiseases: [predictedDiseaseSchema],
  primaryDiagnosis: { type: String },
  
  // Step 3-6: Drug Analysis
  suggestedDrugs: [suggestedDrugSchema],
  avoidedDrugs: [avoidedDrugSchema],
  
  // Step 7: Explanation
  clinicalSummary: { type: String },
  missingDataWarnings: [{ 
    field: String, 
    message: String, 
    impact: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] }
  }],
  safetyFlags: [{ flag: String, details: String, severity: String }],
  
  // Metadata
  status: { 
    type: String, 
    enum: ['processing', 'completed', 'failed', 'requires_review'], 
    default: 'processing' 
  },
  processingErrors: [String],
  reportGenerated: { type: Boolean, default: false },
  reportPath: { type: String },
  reportId: { type: String },
  
  overallConfidence: { type: Number, min: 0, max: 1 },
  guidelinesApplied: [String],
  apisUsed: [String],
  
  processingStarted: { type: Date },
  processingCompleted: { type: Date },
}, { timestamps: true });

// Auto-increment assessment number per user
assessmentSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ userId: this.userId });
    this.assessmentNumber = count + 1;
  }
  next();
});

module.exports = mongoose.model('Assessment', assessmentSchema);

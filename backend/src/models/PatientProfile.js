const mongoose = require('mongoose');

const allergySchema = new mongoose.Schema({
  substance: { type: String, required: true },
  type: { type: String, enum: ['drug', 'food', 'environmental', 'other'] },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life-threatening'] },
  reaction: { type: String },
  rxcui: { type: String }, // RxNorm concept ID
});

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String },
  frequency: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  reason: { type: String },
  prescribedBy: { type: String },
  rxcui: { type: String },
  active: { type: Boolean, default: true },
});

const conditionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icdCode: { type: String },
  diagnosedDate: { type: Date },
  status: { type: String, enum: ['active', 'resolved', 'chronic'], default: 'active' },
  notes: { type: String },
});

const surgerySchema = new mongoose.Schema({
  procedure: { type: String, required: true },
  date: { type: Date },
  hospital: { type: String },
  notes: { type: String },
  complications: { type: String },
});

const vitalSignsSchema = new mongoose.Schema({
  height: { value: Number, unit: { type: String, default: 'cm' } },
  weight: { value: Number, unit: { type: String, default: 'kg' } },
  bmi: { type: Number },
  bloodPressureSystolic: { type: Number },
  bloodPressureDiastolic: { type: Number },
  heartRate: { type: Number },
  temperature: { value: Number, unit: { type: String, default: 'C' } },
  oxygenSaturation: { type: Number },
  bloodGlucose: { type: Number },
  recordedAt: { type: Date, default: Date.now },
});

const familyHistorySchema = new mongoose.Schema({
  condition: { type: String, required: true },
  relation: { type: String },
  notes: { type: String },
});

const patientProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  bloodType: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] 
  },
  smokingStatus: { 
    type: String, 
    enum: ['never', 'former', 'current', 'unknown'], 
    default: 'unknown' 
  },
  alcoholUse: { 
    type: String, 
    enum: ['none', 'occasional', 'moderate', 'heavy', 'unknown'], 
    default: 'unknown' 
  },
  exerciseFrequency: { 
    type: String, 
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'] 
  },
  diet: { type: String, enum: ['omnivore', 'vegetarian', 'vegan', 'other'] },
  occupation: { type: String },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
  },
  allergies: [allergySchema],
  currentMedications: [medicationSchema],
  pastMedications: [medicationSchema],
  conditions: [conditionSchema],
  surgeries: [surgerySchema],
  vitalSigns: [vitalSignsSchema],
  familyHistory: [familyHistorySchema],
  
  // FHIR Resource
  fhirBundle: { type: Object },
  
  // Data completeness tracking
  dataCompleteness: {
    allergies: { type: Boolean, default: false },
    medications: { type: Boolean, default: false },
    conditions: { type: Boolean, default: false },
    vitals: { type: Boolean, default: false },
    labResults: { type: Boolean, default: false },
    familyHistory: { type: Boolean, default: false },
  },
  
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-calculate BMI
patientProfileSchema.methods.calculateBMI = function(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  return Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
};

// Get active medications
patientProfileSchema.methods.getActiveMedications = function() {
  return this.currentMedications.filter(m => m.active);
};

// Get drug names for interaction check
patientProfileSchema.methods.getCurrentDrugNames = function() {
  return this.currentMedications.filter(m => m.active).map(m => m.name.toLowerCase());
};

// Get allergy substances
patientProfileSchema.methods.getAllergySubstances = function() {
  return this.allergies.map(a => a.substance.toLowerCase());
};

module.exports = mongoose.model('PatientProfile', patientProfileSchema);

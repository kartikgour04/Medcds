const mongoose = require('mongoose');

const conditionTriggerSchema = new mongoose.Schema({
  field: { type: String, required: true }, // e.g., 'disease', 'age', 'gender', 'condition'
  operator: { type: String, enum: ['equals', 'contains', 'gte', 'lte', 'exists', 'not_equals'], required: true },
  value: mongoose.Schema.Types.Mixed,
});

const drugActionSchema = new mongoose.Schema({
  drugName: { type: String, required: true },
  genericName: { type: String },
  rxcui: { type: String },
  action: { type: String, enum: ['recommend', 'avoid', 'caution', 'preferred', 'second_line'] },
  reasoning: { type: String },
  doseAdjustment: { type: String },
  priority: { type: Number, default: 1 }, // Lower = higher priority
});

const guidelineRuleSchema = new mongoose.Schema({
  ruleId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: { type: String },
  
  // Source
  source: { 
    type: String, 
    enum: ['WHO', 'NICE', 'ICMR', 'CDC', 'AHA', 'ADA', 'ESC', 'CUSTOM'], 
    required: true 
  },
  sourceVersion: { type: String },
  sourceUrl: { type: String },
  evidenceLevel: { type: String, enum: ['A', 'B', 'C', 'D', 'Expert'] },
  
  // Rule logic
  conditions: [conditionTriggerSchema], // ALL conditions must be true
  anyOfConditions: [conditionTriggerSchema], // At least ONE must be true
  
  // Actions
  drugActions: [drugActionSchema],
  
  // Metadata
  category: { 
    type: String, 
    enum: ['treatment', 'prevention', 'contraindication', 'monitoring', 'dosing'] 
  },
  diseaseArea: [String],
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 5 },
  lastReviewed: { type: Date },
  
}, { timestamps: true });

// Index for fast lookup
guidelineRuleSchema.index({ diseaseArea: 1, isActive: 1 });
guidelineRuleSchema.index({ source: 1 });

module.exports = mongoose.model('GuidelineRule', guidelineRuleSchema);

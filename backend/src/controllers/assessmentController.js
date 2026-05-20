const Assessment = require('../models/Assessment');
const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');
const { runAssessment } = require('../services/assessmentOrchestrator');
const { extractLabResults } = require('../services/aiService');
const logger = require('../utils/logger');

exports.createAssessment = async (req, res) => {
  const { chiefComplaint, symptoms, additionalNotes, labResults } = req.body;
  const user = await User.findById(req.user._id);
  const profile = await PatientProfile.findOne({ userId: req.user._id });

  if (!symptoms || symptoms.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one symptom is required.' });
  }

  const assessment = await Assessment.create({
    userId: req.user._id,
    patientProfileId: profile?._id,
    chiefComplaint,
    symptoms,
    additionalNotes,
    labResults: labResults || [],
    snapshotAge: user.age,
    snapshotGender: user.gender,
    snapshotAllergies: profile?.allergies?.map(a => a.substance) || [],
    snapshotCurrentMeds: profile?.currentMedications?.filter(m => m.active).map(m => m.name) || [],
    snapshotConditions: profile?.conditions?.map(c => c.name) || [],
    status: 'processing',
  });

  // Run async - don't await, return 202 immediately
  runAssessment(assessment._id.toString()).catch(err => {
    logger.error(`Assessment ${assessment._id} failed: ${err.message}`);
  });

  res.status(202).json({
    success: true,
    message: 'Assessment started. Processing in background.',
    assessmentId: assessment._id,
    status: 'processing',
  });
};

exports.getAssessmentStatus = async (req, res) => {
  const assessment = await Assessment.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).select('status processingErrors overallConfidence predictedDiseases suggestedDrugs reportId reportGenerated processingStarted processingCompleted createdAt');

  if (!assessment) {
    return res.status(404).json({ success: false, message: 'Assessment not found.' });
  }

  res.json({
    success: true,
    status: assessment.status,
    assessmentId: assessment._id,
    reportId: assessment.reportId,
    reportGenerated: assessment.reportGenerated,
    overallConfidence: assessment.overallConfidence,
    processingErrors: assessment.processingErrors,
    processingDuration: assessment.processingCompleted && assessment.processingStarted
      ? assessment.processingCompleted - assessment.processingStarted
      : null,
    createdAt: assessment.createdAt,
  });
};

exports.getAssessment = async (req, res) => {
  const assessment = await Assessment.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!assessment) {
    return res.status(404).json({ success: false, message: 'Assessment not found.' });
  }

  res.json({ success: true, assessment });
};

exports.getMyAssessments = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [assessments, total] = await Promise.all([
    Assessment.find({ userId: req.user._id })
      .select('chiefComplaint status assessmentNumber overallConfidence predictedDiseases suggestedDrugs missingDataWarnings reportGenerated reportId createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Assessment.countDocuments({ userId: req.user._id }),
  ]);

  res.json({
    success: true,
    assessments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

exports.extractLabReport = async (req, res) => {
  const { reportText } = req.body;
  if (!reportText) {
    return res.status(400).json({ success: false, message: 'Report text is required.' });
  }

  const extracted = await extractLabResults(reportText);
  res.json({ success: true, extracted });
};

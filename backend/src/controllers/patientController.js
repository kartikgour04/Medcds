const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');
const { buildFHIRBundle } = require('../services/fhirService');

exports.getProfile = async (req, res) => {
  const profile = await PatientProfile.findOne({ userId: req.user._id });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found.' });
  }
  res.json({ success: true, profile });
};

exports.updateProfile = async (req, res) => {
  const allowed = [
    'bloodType', 'smokingStatus', 'alcoholUse', 'exerciseFrequency',
    'diet', 'occupation', 'emergencyContact',
  ];

  const updates = {};
  allowed.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  updates.lastUpdated = new Date();

  let profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  // Update user profile complete flag
  const user = await User.findById(req.user._id);
  if (profile.bloodType && profile.smokingStatus && profile.alcoholUse) {
    user.profileComplete = true;
    await user.save({ validateBeforeSave: false });
  }

  res.json({ success: true, profile });
};

exports.addAllergy = async (req, res) => {
  const { substance, type, severity, reaction } = req.body;
  
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $push: { allergies: { substance, type, severity, reaction } },
      $set: { 'dataCompleteness.allergies': true, lastUpdated: new Date() },
    },
    { new: true }
  );

  res.json({ success: true, allergies: profile.allergies });
};

exports.removeAllergy = async (req, res) => {
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $pull: { allergies: { _id: req.params.allergyId } } },
    { new: true }
  );
  res.json({ success: true, allergies: profile.allergies });
};

exports.addMedication = async (req, res) => {
  const { name, dosage, frequency, startDate, reason, rxcui } = req.body;
  
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $push: { currentMedications: { name, dosage, frequency, startDate, reason, rxcui, active: true } },
      $set: { 'dataCompleteness.medications': true, lastUpdated: new Date() },
    },
    { new: true }
  );

  res.json({ success: true, medications: profile.currentMedications });
};

exports.removeMedication = async (req, res) => {
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $pull: { currentMedications: { _id: req.params.medId } } },
    { new: true }
  );
  res.json({ success: true, medications: profile.currentMedications });
};

exports.addCondition = async (req, res) => {
  const { name, icdCode, diagnosedDate, status, notes } = req.body;
  
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $push: { conditions: { name, icdCode, diagnosedDate, status, notes } },
      $set: { 'dataCompleteness.conditions': true, lastUpdated: new Date() },
    },
    { new: true }
  );

  res.json({ success: true, conditions: profile.conditions });
};

exports.removeCondition = async (req, res) => {
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $pull: { conditions: { _id: req.params.condId } } },
    { new: true }
  );
  res.json({ success: true, conditions: profile.conditions });
};

exports.addSurgery = async (req, res) => {
  const { procedure, date, hospital, notes, complications } = req.body;
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $push: { surgeries: { procedure, date, hospital, notes, complications } } },
    { new: true }
  );
  res.json({ success: true, surgeries: profile.surgeries });
};

exports.addVitalSigns = async (req, res) => {
  const { height, weight, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, oxygenSaturation, bloodGlucose } = req.body;
  
  const vitals = { recordedAt: new Date() };
  if (height) vitals.height = { value: height, unit: 'cm' };
  if (weight) vitals.weight = { value: weight, unit: 'kg' };
  if (bloodPressureSystolic) vitals.bloodPressureSystolic = bloodPressureSystolic;
  if (bloodPressureDiastolic) vitals.bloodPressureDiastolic = bloodPressureDiastolic;
  if (heartRate) vitals.heartRate = heartRate;
  if (temperature) vitals.temperature = { value: temperature, unit: 'C' };
  if (oxygenSaturation) vitals.oxygenSaturation = oxygenSaturation;
  if (bloodGlucose) vitals.bloodGlucose = bloodGlucose;

  if (height && weight) {
    vitals.bmi = Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
  }

  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $push: { vitalSigns: vitals },
      $set: { 'dataCompleteness.vitals': true, lastUpdated: new Date() },
    },
    { new: true }
  );

  res.json({ success: true, latestVitals: vitals, bmi: vitals.bmi });
};

exports.addFamilyHistory = async (req, res) => {
  const { condition, relation, notes } = req.body;
  const profile = await PatientProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $push: { familyHistory: { condition, relation, notes } },
      $set: { 'dataCompleteness.familyHistory': true, lastUpdated: new Date() },
    },
    { new: true }
  );
  res.json({ success: true, familyHistory: profile.familyHistory });
};

exports.getFHIRBundle = async (req, res) => {
  const user = await User.findById(req.user._id);
  const profile = await PatientProfile.findOne({ userId: req.user._id });

  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found.' });
  }

  const fhirBundle = buildFHIRBundle(user, profile);
  res.json({ success: true, fhirBundle });
};

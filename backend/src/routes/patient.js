const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.get('/fhir', ctrl.getFHIRBundle);

router.post('/allergies', ctrl.addAllergy);
router.delete('/allergies/:allergyId', ctrl.removeAllergy);

router.post('/medications', ctrl.addMedication);
router.delete('/medications/:medId', ctrl.removeMedication);

router.post('/conditions', ctrl.addCondition);
router.delete('/conditions/:condId', ctrl.removeCondition);

router.post('/surgeries', ctrl.addSurgery);
router.post('/vitals', ctrl.addVitalSigns);
router.post('/family-history', ctrl.addFamilyHistory);

module.exports = router;

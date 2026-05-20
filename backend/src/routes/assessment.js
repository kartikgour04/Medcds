const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assessmentController');
const { authenticate } = require('../middleware/auth');
const { assessmentLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.post('/', assessmentLimiter, ctrl.createAssessment);
router.get('/', ctrl.getMyAssessments);
router.get('/:id', ctrl.getAssessment);
router.get('/:id/status', ctrl.getAssessmentStatus);
router.post('/extract-lab', ctrl.extractLabReport);

module.exports = router;

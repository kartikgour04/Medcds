// routes/report.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getMyReports);
router.get('/:id', ctrl.getReport);
router.get('/:id/download', ctrl.downloadReport);
router.post('/:id/regenerate', ctrl.regenerateReport);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const GuidelineRule = require('../models/GuidelineRule');
const cache = require('../utils/cache');

router.get('/', authenticate, async (req, res) => {
  const rules = await GuidelineRule.find({ isActive: true })
    .select('ruleId name source category diseaseArea evidenceLevel')
    .sort({ priority: 1 })
    .lean();
  res.json({ success: true, rules });
});

router.get('/:ruleId', authenticate, async (req, res) => {
  const rule = await GuidelineRule.findOne({ ruleId: req.params.ruleId });
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });
  res.json({ success: true, rule });
});

// Admin only: add/update guidelines
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const rule = await GuidelineRule.create(req.body);
  await cache.del('guidelines:all:active');
  res.status(201).json({ success: true, rule });
});

router.put('/:ruleId', authenticate, authorize('admin'), async (req, res) => {
  const rule = await GuidelineRule.findOneAndUpdate(
    { ruleId: req.params.ruleId },
    req.body,
    { new: true }
  );
  await cache.del('guidelines:all:active');
  res.json({ success: true, rule });
});

module.exports = router;

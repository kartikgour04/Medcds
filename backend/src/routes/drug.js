// routes/drug.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDrugInfo, getRxCUI, enrichDrugData } = require('../services/drugService');

router.use(authenticate);

router.get('/info/:name', async (req, res) => {
  const info = await enrichDrugData(req.params.name);
  res.json({ success: true, drug: info });
});

router.get('/rxcui/:name', async (req, res) => {
  const rxcui = await getRxCUI(req.params.name);
  res.json({ success: true, rxcui });
});

module.exports = router;

// routes/guideline.js

const Report      = require('../models/Report');
const Assessment  = require('../models/Assessment');
const fs          = require('fs');
const path        = require('path');

exports.getMyReports = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments({ userId: req.user._id }),
  ]);

  res.json({
    success: true,
    reports,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

exports.getReport = async (req, res) => {
  const report = await Report.findOne({
    $or: [{ reportId: req.params.id }, { _id: req.params.id.length === 24 ? req.params.id : null }],
    userId: req.user._id,
  }).populate('assessmentId');

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  report.viewCount += 1;
  await report.save();

  res.json({ success: true, report });
};

exports.downloadReport = async (req, res) => {
  const report = await Report.findOne({
    $or: [{ reportId: req.params.id }, { _id: req.params.id.length === 24 ? req.params.id : null }],
    userId: req.user._id,
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  if (!report.pdfPath || !fs.existsSync(report.pdfPath)) {
    return res.status(404).json({
      success: false,
      message: 'PDF file not found on server. Please regenerate the report.',
    });
  }

  report.downloadCount += 1;
  await report.save();

  const filename = path.basename(report.pdfPath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Use res.sendFile with absolute path (required by Express)
  res.sendFile(path.resolve(report.pdfPath), (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ success: false, message: 'Error streaming PDF file.' });
    }
  });
};

exports.regenerateReport = async (req, res) => {
  const report = await Report.findOne({
    $or: [{ reportId: req.params.id }, { _id: req.params.id.length === 24 ? req.params.id : null }],
    userId: req.user._id,
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  const assessment = await Assessment.findById(report.assessmentId);
  if (!assessment) {
    return res.status(400).json({ success: false, message: 'Assessment not found.' });
  }

  const { runAssessment } = require('../services/assessmentOrchestrator');
  assessment.status           = 'processing';
  assessment.reportGenerated  = false;
  assessment.processingErrors = [];
  await assessment.save();

  // Fire and forget
  runAssessment(assessment._id.toString()).catch(() => {});

  res.json({ success: true, message: 'Report regeneration started. Check status shortly.' });
};

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Colour palette
const COLORS = {
  primary: '#1a4f7a',
  secondary: '#2d8f7e',
  accent: '#e67e22',
  danger: '#c0392b',
  warning: '#d68910',
  success: '#1e8449',
  text: '#2c3e50',
  lightGray: '#f4f6f8',
  mediumGray: '#bdc3c7',
  darkGray: '#7f8c8d',
  white: '#ffffff',
};

const ensureOutputDir = () => {
  const dir = process.env.PDF_OUTPUT_DIR || path.join(process.cwd(), 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const generateReport = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = ensureOutputDir();
      const filename = `MedCDS_${reportData.reportId}_${Date.now()}.pdf`;
      const outputPath = path.join(outputDir, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Clinical Decision Support Report - ${reportData.patientName}`,
          Author: 'MedCDS Clinical Decision Support System',
          Subject: 'Clinical Decision Support Report',
        },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // ===== HEADER =====
      drawHeader(doc, reportData);

      // ===== DISCLAIMER BANNER =====
      drawDisclaimerBanner(doc);
      doc.moveDown(0.5);

      // ===== PATIENT DETAILS =====
      drawSection(doc, '1. PATIENT DETAILS');
      drawPatientDetails(doc, reportData);
      doc.moveDown();

      // ===== CHIEF COMPLAINT & SYMPTOMS =====
      drawSection(doc, '2. CHIEF COMPLAINT & SYMPTOMS');
      drawSymptoms(doc, reportData);
      doc.moveDown();

      // ===== PREDICTED DISEASES =====
      drawSection(doc, '3. PREDICTED CONDITIONS');
      drawDiseases(doc, reportData);
      doc.moveDown();

      // ===== SUGGESTED DRUGS =====
      drawSection(doc, '4. SUGGESTED MEDICATIONS');
      drawSuggestedDrugs(doc, reportData);
      doc.moveDown();

      // ===== AVOIDED DRUGS =====
      if (reportData.avoidedDrugs?.length > 0) {
        drawSection(doc, '5. AVOIDED MEDICATIONS & REASONS');
        drawAvoidedDrugs(doc, reportData);
        doc.moveDown();
      }

      // ===== MISSING DATA WARNINGS =====
      if (reportData.missingDataWarnings?.length > 0) {
        drawSection(doc, '6. DATA COMPLETENESS WARNINGS');
        drawWarnings(doc, reportData);
        doc.moveDown();
      }

      // ===== SAFETY FLAGS =====
      if (reportData.safetyFlags?.length > 0) {
        drawSection(doc, '7. SAFETY FLAGS');
        drawSafetyFlags(doc, reportData);
        doc.moveDown();
      }

      // ===== CLINICAL SUMMARY =====
      drawSection(doc, '8. CLINICAL SUMMARY');
      drawClinicalSummary(doc, reportData);
      doc.moveDown();

      // ===== GUIDELINES APPLIED =====
      if (reportData.guidelinesApplied?.length > 0) {
        drawSection(doc, '9. CLINICAL GUIDELINES APPLIED');
        drawGuidelines(doc, reportData);
        doc.moveDown();
      }

      // ===== FOOTER DISCLAIMER =====
      drawFooter(doc, reportData);

      doc.end();

      stream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        logger.info(`PDF report generated: ${filename} (${stats.size} bytes)`);
        resolve({ path: outputPath, filename, size: stats.size });
      });

      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

// ===== DRAWING FUNCTIONS =====

const drawHeader = (doc, data) => {
  // Header background
  doc.rect(0, 0, doc.page.width, 90).fill(COLORS.primary);

  // Logo / Title
  doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.white)
    .text('MedCDS', 50, 20, { continued: true })
    .font('Helvetica').fontSize(14).text(' Clinical Decision Support System');

  doc.fontSize(10).fillColor('#a8d4f5')
    .text('Clinical Decision Support Report  •  NOT A PRESCRIPTION', 50, 50);

  doc.fontSize(9).fillColor(COLORS.white)
    .text(`Report ID: ${data.reportId}`, 50, 68, { continued: true })
    .text(`  |  Generated: ${new Date(data.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, { continued: true })
    .text(`  |  Confidence: ${Math.round((data.overallConfidence || 0.5) * 100)}%`);

  doc.moveDown(3);
  doc.fillColor(COLORS.text);
};

const drawDisclaimerBanner = (doc) => {
  const y = doc.y;
  doc.rect(50, y, doc.page.width - 100, 36)
    .fill('#fef9e7').stroke(COLORS.warning);

  doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.warning)
    .text('⚠ IMPORTANT DISCLAIMER:', 58, y + 6, { continued: true })
    .font('Helvetica').fillColor(COLORS.text)
    .text(' This report is AI-generated for clinical decision support only. It is NOT a prescription or diagnosis. Always consult a qualified healthcare professional before starting, stopping, or changing any medication.', { width: doc.page.width - 116 });

  doc.y = y + 44;
};

const drawSection = (doc, title) => {
  const y = doc.y;
  doc.rect(50, y, doc.page.width - 100, 22).fill(COLORS.primary);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.white)
    .text(title, 58, y + 5);
  doc.y = y + 28;
  doc.fillColor(COLORS.text);
};

const drawPatientDetails = (doc, data) => {
  const details = [
    ['Full Name', data.patientName || 'N/A'],
    ['Age / Gender', `${data.patientAge ? data.patientAge + ' years' : 'N/A'} / ${data.patientGender || 'N/A'}`],
    ['Assessment #', data.assessmentNumber || '1'],
    ['Assessment Date', new Date(data.reportDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Known Allergies', data.snapshotAllergies?.join(', ') || 'None recorded'],
    ['Current Medications', data.snapshotCurrentMeds?.join(', ') || 'None recorded'],
    ['Known Conditions', data.snapshotConditions?.join(', ') || 'None recorded'],
  ];

  const colW = (doc.page.width - 100) / 2;
  let x = 50, y = doc.y;

  details.forEach(([label, value], i) => {
    if (i % 2 === 0 && i !== 0) {
      y += 28;
      x = 50;
    }
    const col = i % 2 === 0 ? 0 : 1;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.darkGray)
      .text(label + ':', 50 + col * colW, y);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
      .text(value, 50 + col * colW, y + 10, { width: colW - 10 });
  });

  doc.y = y + 36;
};

const drawSymptoms = (doc, data) => {
  if (data.chiefComplaint) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
      .text('Chief Complaint: ', { continued: true })
      .font('Helvetica').text(data.chiefComplaint);
    doc.moveDown(0.3);
  }

  if (data.symptoms?.length > 0) {
    doc.fontSize(9).font('Helvetica-Bold').text('Reported Symptoms:');
    data.symptoms.forEach(s => {
      const severity = s.severity ? ` [${s.severity}]` : '';
      const duration = s.duration ? ` — ${s.duration} ${s.durationUnit || ''}` : '';
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
        .text(`• ${s.name}${severity}${duration}`, { indent: 10 });
    });
  }
};

const drawDiseases = (doc, data) => {
  if (!data.predictedDiseases?.length) {
    doc.fontSize(9).font('Helvetica').text('No conditions predicted.');
    return;
  }

  data.predictedDiseases.slice(0, 5).forEach((disease, i) => {
    const confidence = Math.round((disease.confidenceScore || 0) * 100);
    const barWidth = Math.round(((doc.page.width - 220)) * (confidence / 100));
    const y = doc.y;

    // Rank badge
    const badgeColor = i === 0 ? COLORS.primary : i === 1 ? COLORS.secondary : COLORS.darkGray;
    doc.circle(65, y + 8, 9).fill(badgeColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white).text(`#${i + 1}`, 60, y + 4);

    // Disease name
    doc.fontSize(10).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fillColor(COLORS.text)
      .text(disease.name, 82, y, { width: 240 });

    // ICD code
    if (disease.icdCode) {
      doc.fontSize(7).font('Helvetica').fillColor(COLORS.darkGray)
        .text(`ICD: ${disease.icdCode}`, 82, y + 12);
    }

    // Confidence bar
    const barX = 340;
    doc.rect(barX, y + 2, doc.page.width - 340 - 50, 10).fill('#ecf0f1');
    const fillColor = confidence >= 70 ? COLORS.success : confidence >= 40 ? COLORS.warning : COLORS.danger;
    doc.rect(barX, y + 2, barWidth, 10).fill(fillColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.text)
      .text(`${confidence}%`, barX + (doc.page.width - 340 - 50) + 4, y + 2);

    doc.moveDown(i === 0 ? 1.4 : 1.2);
    doc.fillColor(COLORS.text);
  });
};

const drawSuggestedDrugs = (doc, data) => {
  if (!data.suggestedDrugs?.length) {
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.success)
      .text('No medications suggested based on available data and safety filters.');
    return;
  }

  data.suggestedDrugs.forEach((drug, i) => {
    const y = doc.y;

    // Drug header box
    doc.rect(50, y, doc.page.width - 100, 20).fill(COLORS.secondary);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.white)
      .text(`${i + 1}. ${drug.name}${drug.genericName && drug.genericName !== drug.name ? ` (${drug.genericName})` : ''}`, 58, y + 4);

    if (drug.isFirstLine) {
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#a8f0e0')
        .text('FIRST-LINE', doc.page.width - 110, y + 6);
    }

    doc.y = y + 26;

    // Drug details in 2 columns
    const details = [];
    if (drug.drugClass) details.push(['Class', drug.drugClass]);
    if (drug.dosageRecommendation?.dose) details.push(['Dose', `${drug.dosageRecommendation.dose} ${drug.dosageRecommendation.frequency || ''}`]);
    if (drug.dosageRecommendation?.route) details.push(['Route', drug.dosageRecommendation.route]);
    if (drug.dosageRecommendation?.duration) details.push(['Duration', drug.dosageRecommendation.duration]);
    if (drug.targetDisease) details.push(['For', drug.targetDisease]);
    if (drug.safetyScore) details.push(['Safety Score', `${drug.safetyScore}/10`]);

    const colW = (doc.page.width - 100) / 2;
    details.forEach(([label, value], j) => {
      const col = j % 2;
      const row = Math.floor(j / 2);
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.darkGray)
        .text(label + ': ', 55 + col * colW, doc.y - (j % 2 === 1 ? 12 : 0));
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.text)
        .text(value, { continued: false });
    });

    // Why suggested
    if (drug.whySuggested?.length) {
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.success).text('✓ Why Suggested:');
      drug.whySuggested.forEach(reason => {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.text).text(`  • ${reason}`, { indent: 5 });
      });
    }

    // Guidelines
    if (drug.guidelines?.length) {
      doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.darkGray)
        .text(`  Guidelines: ${drug.guidelines.join(' | ')}`);
    }

    // Warnings
    if (drug.warnings?.length) {
      doc.fontSize(7).font('Helvetica').fillColor(COLORS.warning)
        .text(`  ⚠ ${drug.warnings.slice(0, 2).join(' | ')}`);
    }

    // Monitoring
    if (drug.monitoringRequired?.length) {
      doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.accent)
        .text(`  Monitor: ${drug.monitoringRequired.join(', ')}`);
    }

    doc.moveDown(0.6);
  });
};

const drawAvoidedDrugs = (doc, data) => {
  data.avoidedDrugs.forEach((drug, i) => {
    const y = doc.y;
    doc.rect(50, y, doc.page.width - 100, 18).fill('#fdedec');
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.danger)
      .text(`✗ ${drug.name}${drug.genericName && drug.genericName !== drug.name ? ` (${drug.genericName})` : ''}`, 58, y + 4);

    doc.y = y + 22;
    for (const reason of (drug.avoidanceReasons || [])) {
      const icon = reason.type === 'allergy' ? '🚫' :
                   reason.type === 'drug_interaction' ? '⚡' :
                   reason.type === 'already_taking' ? '💊' : '⚠';
      const typeLabel = reason.type.replace(/_/g, ' ').toUpperCase();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.danger).text(`  ${icon} [${typeLabel}] `, { continued: true })
        .font('Helvetica').fillColor(COLORS.text).text(reason.detail);
    }
    doc.moveDown(0.4);
  });
};

const drawWarnings = (doc, data) => {
  data.missingDataWarnings.forEach(warning => {
    const icon = warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢';
    const y = doc.y;
    doc.rect(50, y, 4, 30).fill(
      warning.severity === 'high' ? COLORS.danger :
      warning.severity === 'medium' ? COLORS.warning : COLORS.success
    );
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
      .text(`${icon} ${warning.message}`, 60, y);
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.darkGray)
      .text(`Impact: ${warning.impact}`, 60, doc.y, { width: doc.page.width - 120 });
    doc.moveDown(0.5);
  });
};

const drawSafetyFlags = (doc, data) => {
  data.safetyFlags.forEach(flag => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.danger)
      .text(`🚩 ${flag.flag}: `, { continued: true })
      .font('Helvetica').fillColor(COLORS.text).text(flag.details);
  });
};

const drawClinicalSummary = (doc, data) => {
  if (data.clinicalSummary) {
    doc.rect(50, doc.y, doc.page.width - 100, 2).fill(COLORS.mediumGray);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
      .text(data.clinicalSummary, { width: doc.page.width - 100, align: 'justify' });
  }
};

const drawGuidelines = (doc, data) => {
  data.guidelinesApplied.forEach(g => {
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.text).text(`• ${g}`);
  });
};

const drawFooter = (doc, data) => {
  // Add new page if near bottom
  if (doc.y > doc.page.height - 150) doc.addPage();

  const y = doc.page.height - 110;
  doc.rect(0, y - 10, doc.page.width, 120).fill(COLORS.primary);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#f8d7da')
    .text('⚕ MEDICAL & LEGAL DISCLAIMER', 50, y - 2, { align: 'center', width: doc.page.width - 100 });

  doc.fontSize(7).font('Helvetica').fillColor(COLORS.white)
    .text(data.disclaimer || 'This report is NOT a prescription. Always consult a doctor.', 50, y + 12, {
      width: doc.page.width - 100, align: 'center',
    });

  doc.fontSize(7).fillColor('#a8d4f5')
    .text(`MedCDS v1.0  |  Report ID: ${data.reportId}  |  ${new Date(data.reportDate).toISOString()}  |  For clinical support use only`, 50, y + 50, {
      width: doc.page.width - 100, align: 'center',
    });

  doc.fillColor(COLORS.text);
};

module.exports = { generateReport };

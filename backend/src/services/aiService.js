/**
 * AI Service — powered by Anthropic Claude
 * Replaces OpenAI with Claude for clinical summaries, lab extraction, and reasoning
 */

const axios = require('axios');
const logger = require('../utils/logger');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const callClaude = async (systemPrompt, userContent, maxTokens = 800) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY not set — using fallback');
    return null;
  }

  try {
    const response = await axios.post(
      ANTHROPIC_URL,
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    return response.data.content?.[0]?.text || null;
  } catch (err) {
    logger.error(`[Claude AI] API call failed: ${err.message}`);
    return null;
  }
};

const parseJSON = (text) => {
  if (!text) return null;
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const objMatch = clean.match(/\{[\s\S]*\}/);
  return JSON.parse(objMatch ? objMatch[0] : clean);
};

/**
 * Extract structured lab results from uploaded report text
 */
const extractLabResults = async (reportText) => {
  const systemPrompt = `You are a clinical data extraction assistant. Extract structured lab results from the provided medical report text. Return ONLY valid JSON with this schema:
{
  "labResults": [
    {
      "testName": "string",
      "value": "number or string",
      "unit": "string",
      "referenceRange": "string",
      "abnormal": true/false,
      "notes": "string or null"
    }
  ],
  "extractedConditions": ["string"],
  "extractedMedications": ["string"],
  "reportType": "string",
  "reportDate": "string or null",
  "summary": "string"
}
Return ONLY valid JSON, no markdown, no explanation.`;

  const text = await callClaude(systemPrompt, `Extract data from this medical report:\n\n${reportText.slice(0, 4000)}`, 1500);
  if (!text) return getMockLabExtraction(reportText);

  try {
    return parseJSON(text);
  } catch (err) {
    logger.error(`Lab extraction JSON parse error: ${err.message}`);
    return getMockLabExtraction(reportText);
  }
};

/**
 * Interpret doctor notes and extract clinical insights
 */
const interpretDoctorNotes = async (notes) => {
  const systemPrompt = `You are a clinical NLP system. Extract medical entities from doctor notes. Return ONLY valid JSON:
{
  "conditions": ["string"],
  "medications": ["string"],
  "allergies": ["string"],
  "symptoms": ["string"],
  "procedures": ["string"],
  "insights": ["string"]
}`;

  const text = await callClaude(systemPrompt, `Parse these doctor notes:\n\n${notes}`, 800);
  if (!text) return { conditions: [], medications: [], allergies: [], symptoms: [], procedures: [], insights: [] };

  try {
    return parseJSON(text);
  } catch {
    return { conditions: [], medications: [], allergies: [], symptoms: [], procedures: [], insights: [] };
  }
};

/**
 * Generate clinical narrative summary for the report
 */
const generateClinicalSummary = async (assessmentData) => {
  const systemPrompt = `You are a clinical decision support system generating professional clinical summaries for patient reports.
Write a clear 3-5 sentence objective clinical summary.
DO NOT prescribe. DO NOT make definitive diagnoses.
Always recommend professional consultation.
Use formal but accessible clinical language suitable for both doctors and educated patients in India.`;

  const prompt = `Patient: ${assessmentData.age || 'adult'}-year-old ${assessmentData.gender || 'patient'}
Chief Complaint: ${assessmentData.chiefComplaint}
Symptoms: ${(assessmentData.symptoms || []).map(s => s.name).join(', ')}
Predicted Conditions: ${(assessmentData.predictedDiseases || []).slice(0, 3).map(d => `${d.name} (${Math.round((d.confidenceScore || 0.5) * 100)}%)`).join(', ')}
Suggested Drugs: ${(assessmentData.suggestedDrugs || []).map(d => d.name).join(', ')}
Drugs Avoided: ${(assessmentData.avoidedDrugs || []).map(d => d.name).join(', ')}
Known Allergies: ${(assessmentData.allergies || []).join(', ') || 'None recorded'}
Current Medications: ${(assessmentData.currentMeds || []).join(', ') || 'None recorded'}

Generate a clinical summary for this patient report.`;

  const text = await callClaude(systemPrompt, prompt, 500);
  if (text) {
    logger.info('[Claude AI] Clinical summary generated');
    return text;
  }
  return generateMockSummary(assessmentData);
};

/**
 * Generate detailed reasoning for drug suggestions
 */
const generateDrugReasoning = async (drug, disease, patientContext) => {
  const text = await callClaude(
    'You are a clinical pharmacology expert. Provide concise, evidence-based reasoning for drug decisions in 1-2 sentences only.',
    `Why is ${drug} recommended for ${disease} in a patient with: ${JSON.stringify(patientContext)}?`,
    150
  );
  return text || null;
};

// Fallbacks
const getMockLabExtraction = (text) => ({
  labResults: [],
  extractedConditions: [],
  extractedMedications: [],
  reportType: 'Unknown',
  reportDate: null,
  summary: 'Report uploaded. AI extraction unavailable — manual review required.',
});

const generateMockSummary = (data) => {
  const top = data.predictedDiseases?.[0];
  const drugCount = (data.suggestedDrugs || []).length;
  const avoidedCount = (data.avoidedDrugs || []).length;
  return `Clinical assessment performed for a ${data.age || 'adult'}-year-old ${data.gender || 'patient'} presenting with ${data.chiefComplaint || 'reported symptoms'}. ${top ? `The most likely condition based on symptom analysis is ${top.name} (${Math.round((top.confidenceScore || 0.5) * 100)}% confidence).` : ''} ${drugCount} medication(s) have been suggested and ${avoidedCount} have been excluded based on the patient's medical history, allergies, and applicable clinical guidelines. Professional medical consultation is strongly recommended before initiating any treatment. This report is intended as decision support only.`;
};

module.exports = {
  extractLabResults,
  interpretDoctorNotes,
  generateClinicalSummary,
  generateDrugReasoning,
};

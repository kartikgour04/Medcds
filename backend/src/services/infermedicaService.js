/**
 * Disease Prediction Service — powered by Claude AI
 * Replaces Infermedica with Anthropic Claude (free with API key)
 */

const axios = require('axios');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const callClaude = async (systemPrompt, userContent, maxTokens = 1000) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in .env');

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
  return response.data.content?.[0]?.text || '';
};

const parseJSON = (text) => {
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  // Try to extract array from text if there's preamble
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  return JSON.parse(arrMatch ? arrMatch[0] : clean);
};

const getDiagnosis = async (patientData) => {
  const { symptoms, age, gender } = patientData;
  if (!symptoms || symptoms.length === 0) return getMockDiagnosis(symptoms);

  const symptomList = symptoms
    .map(s => `${s.name} (${s.severity || 'moderate'})`)
    .join(', ');

  const cacheKey = `claude:dx:${symptomList}:${age}:${gender}`;
  const cached = await cache.get(cacheKey).catch(() => null);
  if (cached) return cached;

  const systemPrompt = `You are a clinical decision support AI producing ONLY valid JSON. No explanation, no markdown, no preamble. You support physicians — you do not diagnose or prescribe.`;

  const userContent = `Patient: ${age || 'adult'}-year-old ${gender || 'person'}
Symptoms: ${symptomList}

Return a JSON array of up to 5 differential diagnoses ordered by probability:
[
  {
    "name": "Disease name",
    "icdCode": "ICD-10 code or null",
    "confidenceScore": 0.0-1.0,
    "confidenceLevel": "low|moderate|high|very_high",
    "description": "One sentence clinical description",
    "prevalence": "common|uncommon|rare",
    "urgencyLevel": "routine|soon|urgent|emergency",
    "keySymptoms": ["symptom1"],
    "redFlags": ["red flag if any"]
  }
]
Return ONLY the JSON array.`;

  try {
    const text = await callClaude(systemPrompt, userContent, 1200);
    const diseases = parseJSON(text);
    if (!Array.isArray(diseases)) throw new Error('Not an array');

    const result = diseases.map(d => ({
      name: d.name,
      id: d.name.toLowerCase().replace(/\s+/g, '_'),
      icdCode: d.icdCode || null,
      confidenceScore: Math.min(1, Math.max(0, d.confidenceScore || 0.5)),
      confidenceLevel: d.confidenceLevel || 'moderate',
      source: 'ai',
      description: d.description || '',
      prevalence: d.prevalence || 'common',
      urgencyLevel: d.urgencyLevel || 'routine',
      keySymptoms: d.keySymptoms || [],
      redFlags: d.redFlags || [],
    }));

    await cache.set(cacheKey, result, 1800).catch(() => {});
    logger.info(`[Claude] ${result.length} diagnoses predicted`);
    return result;
  } catch (err) {
    logger.error(`[Claude] Disease prediction failed: ${err.message}`);
    return getMockDiagnosis(symptoms);
  }
};

const getMockDiagnosis = (symptoms) => {
  const names = (symptoms || []).map(s => (s.name || '').toLowerCase());
  const rules = [
    { triggers: ['fever', 'cough', 'sore throat', 'cold', 'runny nose'], name: 'Upper Respiratory Tract Infection', icd: 'J06.9', conf: 0.72, urgency: 'routine' },
    { triggers: ['fever', 'body ache', 'fatigue', 'headache', 'chills'], name: 'Influenza', icd: 'J11.1', conf: 0.65, urgency: 'soon' },
    { triggers: ['chest pain', 'shortness of breath', 'cough', 'fever'], name: 'Pneumonia', icd: 'J18.9', conf: 0.60, urgency: 'urgent' },
    { triggers: ['frequent urination', 'burning', 'lower abdominal pain'], name: 'Urinary Tract Infection', icd: 'N39.0', conf: 0.70, urgency: 'soon' },
    { triggers: ['excessive thirst', 'frequent urination', 'weight loss', 'fatigue'], name: 'Type 2 Diabetes Mellitus', icd: 'E11.9', conf: 0.55, urgency: 'soon' },
    { triggers: ['headache', 'dizziness', 'chest pain', 'palpitation'], name: 'Hypertension', icd: 'I10', conf: 0.50, urgency: 'soon' },
    { triggers: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea'], name: 'Acute Gastroenteritis', icd: 'K59.1', conf: 0.68, urgency: 'routine' },
    { triggers: ['joint pain', 'swelling', 'stiffness'], name: 'Rheumatoid Arthritis', icd: 'M05.9', conf: 0.45, urgency: 'soon' },
    { triggers: ['skin rash', 'itching', 'redness', 'fever'], name: 'Viral Exanthem', icd: 'B09', conf: 0.50, urgency: 'routine' },
    { triggers: ['back pain', 'muscle ache', 'stiffness'], name: 'Musculoskeletal Pain', icd: 'M79.3', conf: 0.60, urgency: 'routine' },
    { triggers: ['malaria', 'chills', 'sweating', 'fever', 'cyclical'], name: 'Malaria (suspected)', icd: 'B54', conf: 0.55, urgency: 'urgent' },
    { triggers: ['dengue', 'fever', 'rash', 'joint pain', 'eye pain'], name: 'Dengue Fever', icd: 'A90', conf: 0.55, urgency: 'urgent' },
    { triggers: ['typhoid', 'prolonged fever', 'abdominal pain', 'constipation'], name: 'Typhoid Fever', icd: 'A01.0', conf: 0.55, urgency: 'urgent' },
  ];

  const scored = rules
    .map(r => ({ ...r, score: r.triggers.filter(t => names.some(n => n.includes(t) || t.includes(n))).length }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!scored.length) return [{
    name: 'Unspecified Illness — Clinical Evaluation Required',
    id: 'unspecified', icdCode: 'R69',
    confidenceScore: 0.3, confidenceLevel: 'low', source: 'ai',
    description: 'Insufficient symptom data. Please consult a physician.',
    prevalence: 'common', urgencyLevel: 'soon',
  }];

  return scored.map(r => ({
    name: r.name, id: r.name.toLowerCase().replace(/\s+/g, '_'),
    icdCode: r.icd, confidenceScore: Math.max(0.3, r.conf - (2 - Math.min(r.score, 2)) * 0.1),
    confidenceLevel: r.conf >= 0.65 ? 'high' : 'moderate', source: 'ai',
    description: `Matched ${r.score} clinical indicator(s).`,
    prevalence: 'common', urgencyLevel: r.urgency,
  }));
};

const mergeDiseasePredictions = (primary, secondary) => {
  const merged = [...primary];
  for (const d of secondary) {
    if (!merged.find(m => m.name.toLowerCase() === d.name.toLowerCase())) merged.push(d);
  }
  return merged.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 6);
};

module.exports = { getDiagnosis, getMockDiagnosis, mergeDiseasePredictions };

module.exports = {
  // Claude (Anthropic) — replaces OpenAI and all disease prediction APIs
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  // Free drug info APIs — no key needed
  openFDA: {
    apiKey: process.env.OPENFDA_API_KEY || '', // Optional — higher rate limits with key
    url: process.env.OPENFDA_API_URL || 'https://api.fda.gov',
  },
  rxNorm: {
    url: process.env.RXNORM_API_URL || 'https://rxnav.nlm.nih.gov/REST',
  },
  dailyMed: {
    url: process.env.DAILYMED_API_URL || 'https://dailymed.nlm.nih.gov/dailymed/services/v2',
  },
  // Legacy fields kept for compatibility
  infermedica: { appId: '', appKey: '', url: '' },
  isabel: { apiKey: '', url: '' },
  openAI: { apiKey: '' },
  drugBank: { apiKey: '', url: '' },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  fhir: { serverUrl: process.env.FHIR_SERVER_URL || 'https://hapi.fhir.org/baseR4' },
};

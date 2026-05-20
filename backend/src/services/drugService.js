const axios = require('axios');
const apiKeys = require('../config/apiKeys');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

// ==================== OpenFDA ====================

const openFDAClient = axios.create({
  baseURL: apiKeys.openFDA.url,
  timeout: 10000,
});

const getDrugInfo = async (drugName) => {
  const cacheKey = `openfda:drug:${drugName.toLowerCase()}`;
  return cache.wrap(cacheKey, async () => {
    try {
      const params = {
        search: `openfda.generic_name:"${drugName}"`,
        limit: 1,
      };
      if (apiKeys.openFDA.apiKey) params.api_key = apiKeys.openFDA.apiKey;
      
      const response = await openFDAClient.get('/drug/label.json', { params });
      const result = response.data.results?.[0];
      
      if (!result) return null;
      
      return {
        brandName: result.openfda?.brand_name?.[0],
        genericName: result.openfda?.generic_name?.[0] || drugName,
        manufacturer: result.openfda?.manufacturer_name?.[0],
        drugClass: result.openfda?.pharm_class_epc?.[0],
        indications: result.indications_and_usage?.[0]?.slice(0, 500),
        contraindications: result.contraindications?.[0]?.slice(0, 500),
        warnings: result.warnings?.[0]?.slice(0, 500),
        adverseReactions: result.adverse_reactions?.[0]?.slice(0, 500),
        dosage: result.dosage_and_administration?.[0]?.slice(0, 300),
        boxedWarning: result.boxed_warning?.[0]?.slice(0, 300),
      };
    } catch (error) {
      if (error.response?.status === 404) return null;
      logger.error(`OpenFDA drug info error for ${drugName}: ${error.message}`);
      return null;
    }
  }, 86400); // 24h cache
};

const checkAdverseEvents = async (drugName) => {
  const cacheKey = `openfda:adverse:${drugName.toLowerCase()}`;
  return cache.wrap(cacheKey, async () => {
    try {
      const response = await openFDAClient.get('/drug/event.json', {
        params: {
          search: `patient.drug.medicinalproduct:"${drugName}"&serious:1`,
          count: 'patient.reaction.reactionmeddrapt.exact',
          limit: 10,
        },
      });
      
      return (response.data.results || []).map(r => ({
        reaction: r.term,
        count: r.count,
      }));
    } catch {
      return [];
    }
  }, 3600);
};

// ==================== RxNorm ====================

const rxNormClient = axios.create({
  baseURL: apiKeys.rxNorm.url,
  timeout: 10000,
});

const getRxCUI = async (drugName) => {
  const cacheKey = `rxnorm:rxcui:${drugName.toLowerCase()}`;
  return cache.wrap(cacheKey, async () => {
    try {
      const response = await rxNormClient.get('/rxcui.json', {
        params: { name: drugName, search: 1 },
      });
      const rxcui = response.data?.idGroup?.rxnormId?.[0];
      return rxcui || null;
    } catch {
      return null;
    }
  }, 86400);
};

const getDrugInteractions = async (rxcuis) => {
  if (!rxcuis || rxcuis.length < 2) return [];
  
  const cacheKey = `rxnorm:interactions:${rxcuis.sort().join('-')}`;
  return cache.wrap(cacheKey, async () => {
    try {
      const response = await rxNormClient.get('/interaction/list.json', {
        params: { rxcuis: rxcuis.join('+') },
      });
      
      const interactionPairs = response.data?.fullInteractionTypeGroup || [];
      const interactions = [];
      
      for (const group of interactionPairs) {
        for (const type of (group.fullInteractionType || [])) {
          for (const pair of (type.interactionPair || [])) {
            interactions.push({
              drug1: pair.interactionConcept?.[0]?.minConceptItem?.name,
              drug2: pair.interactionConcept?.[1]?.minConceptItem?.name,
              severity: pair.severity,
              description: pair.description,
            });
          }
        }
      }
      
      return interactions;
    } catch (error) {
      logger.error(`RxNorm interaction check error: ${error.message}`);
      return [];
    }
  }, 3600);
};

const getDrugClass = async (rxcui) => {
  const cacheKey = `rxnorm:class:${rxcui}`;
  return cache.wrap(cacheKey, async () => {
    try {
      const response = await rxNormClient.get(`/rxclass/class/byRxcui.json`, {
        params: { rxcui, relaSource: 'ATC' },
      });
      return response.data?.rxclassDrugInfoList?.rxclassDrugInfo?.[0]?.rxclassMinConceptItem?.className;
    } catch {
      return null;
    }
  }, 86400);
};

// ==================== DailyMed ====================

const dailyMedClient = axios.create({
  baseURL: apiKeys.dailyMed.url,
  timeout: 10000,
});

const getDailyMedInfo = async (drugName) => {
  const cacheKey = `dailymed:${drugName.toLowerCase()}`;
  return cache.wrap(cacheKey, async () => {
    try {
      const searchResponse = await dailyMedClient.get('/spls.json', {
        params: { drug_name: drugName, limit: 1 },
      });
      
      const spl = searchResponse.data?.data?.[0];
      if (!spl) return null;
      
      return {
        setId: spl.setid,
        title: spl.title,
        published: spl.published,
        url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${spl.setid}`,
      };
    } catch {
      return null;
    }
  }, 86400);
};

// ==================== Enrichment Aggregator ====================

const enrichDrugData = async (drugName) => {
  const [openFDAInfo, rxcui, dailyMedInfo, adverseEvents] = await Promise.allSettled([
    getDrugInfo(drugName),
    getRxCUI(drugName),
    getDailyMedInfo(drugName),
    checkAdverseEvents(drugName),
  ]);
  
  const rxcuiValue = rxcui.value;
  let interactions = [];
  let drugClass = null;
  
  if (rxcuiValue) {
    [interactions, drugClass] = await Promise.all([
      getDrugInteractions([rxcuiValue]).catch(() => []),
      getDrugClass(rxcuiValue).catch(() => null),
    ]);
  }
  
  return {
    name: drugName,
    rxcui: rxcuiValue,
    fdaInfo: openFDAInfo.value,
    dailyMedInfo: dailyMedInfo.value,
    adverseEvents: adverseEvents.value || [],
    knownInteractions: interactions,
    drugClass: drugClass || openFDAInfo.value?.drugClass,
  };
};

module.exports = {
  getDrugInfo,
  getRxCUI,
  getDrugInteractions,
  getDrugClass,
  getDailyMedInfo,
  checkAdverseEvents,
  enrichDrugData,
};

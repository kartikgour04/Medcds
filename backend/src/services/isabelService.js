/**
 * Isabel Service stub — replaced by Claude-powered infermedicaService
 * Returns empty results so orchestrator falls back gracefully
 */

const { getMockDiagnosis, mergeDiseasePredictions } = require('./infermedicaService');

const getDiagnosis = async () => [];

module.exports = { getDiagnosis, getMockDiagnosis, mergeDiseasePredictions };

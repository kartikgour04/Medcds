import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assessmentAPI, reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  DocumentArrowDownIcon, ArrowPathIcon, ShieldExclamationIcon,
  BeakerIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon,
  ExclamationTriangleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';

/* ── Confidence ring SVG ─────────────────────────────── */
const ConfidenceRing = ({ value }) => {
  const pct   = Math.round((value || 0) * 100);
  const r     = 40;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="50" y="55" textAnchor="middle" fill="white"
              fontSize="20" fontWeight="bold">{pct}%</text>
      </svg>
      <p className="text-xs text-slate-500 mt-1">Confidence</p>
    </div>
  );
};

/* ── Expandable drug card ────────────────────────────── */
const DrugCard = ({ drug, type }) => {
  const [open, setOpen] = useState(false);
  const avoided = type === 'avoided';
  return (
    <div className={`rounded-xl border overflow-hidden ${
      avoided
        ? 'border-red-900/40 bg-red-950/10'
        : 'border-green-900/40 bg-green-950/10'
    }`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          avoided ? 'bg-red-950/50 text-red-400' : 'bg-green-950/50 text-green-400'
        }`}>
          {avoided
            ? <ShieldExclamationIcon className="w-4 h-4" />
            : <BeakerIcon className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-100 text-sm">{drug.name}</span>
            {drug.genericName && drug.genericName !== drug.name && (
              <span className="text-xs text-slate-500">({drug.genericName})</span>
            )}
            {!avoided && drug.isFirstLine && (
              <span className="badge-success text-xs">First-line</span>
            )}
            {!avoided && drug.safetyScore && (
              <span className="badge-info text-xs">Safety {drug.safetyScore}/10</span>
            )}
          </div>
          {drug.drugClass && (
            <p className="text-xs text-slate-500 mt-0.5">{drug.drugClass}</p>
          )}
        </div>
        {open
          ? <ChevronUpIcon   className="w-4 h-4 text-slate-500 flex-shrink-0" />
          : <ChevronDownIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800/50">
          {/* Suggested drug details */}
          {!avoided && (
            <>
              {drug.whySuggested?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-1.5">✓ Why Suggested</p>
                  {drug.whySuggested.map((r, i) => (
                    <p key={i} className="text-xs text-slate-300 ml-3">• {r}</p>
                  ))}
                </div>
              )}
              {drug.guidelines?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Guidelines</p>
                  <div className="flex flex-wrap gap-1">
                    {drug.guidelines.map((g, i) => (
                      <span key={i} className="badge-info text-xs">{g}</span>
                    ))}
                  </div>
                </div>
              )}
              {drug.dosageRecommendation?.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Dosage Notes</p>
                  <p className="text-xs text-slate-400">{drug.dosageRecommendation.notes}</p>
                </div>
              )}
              {drug.sideEffects?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1">Common Side Effects</p>
                  <p className="text-xs text-slate-400">{drug.sideEffects.join(', ')}</p>
                </div>
              )}
              {drug.warnings?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1">⚠ Warnings</p>
                  {drug.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-300/80 ml-2">
                      • {w.slice(0, 160)}
                    </p>
                  ))}
                </div>
              )}
              {drug.monitoringRequired?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-400 mb-1">Monitor</p>
                  <p className="text-xs text-slate-400">
                    {drug.monitoringRequired.join(', ')}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Avoided drug reasons */}
          {avoided && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-red-400 mb-1.5">✗ Why Avoided</p>
              {drug.avoidanceReasons?.map((r, i) => (
                <div key={i}
                  className="p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg">
                  <span className={`text-xs font-bold uppercase tracking-wide mr-1 ${
                    r.type === 'allergy'          ? 'text-red-400'   :
                    r.type === 'drug_interaction' ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {r.type?.replace(/_/g, ' ')} —
                  </span>
                  <span className="text-xs text-slate-300">{r.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main page ───────────────────────────────────────── */
export default function AssessmentDetailPage() {
  const { id } = useParams();
  const [assessment,  setAssessment]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [polling,     setPolling]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchAssessment = useCallback(async () => {
    try {
      const res = await assessmentAPI.getById(id);
      setAssessment(res.data.assessment);
      return res.data.assessment;
    } catch {
      toast.error('Failed to load assessment');
      return null;
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const a = await fetchAssessment();
      setLoading(false);
      if (a?.status === 'processing') setPolling(true);
    })();
  }, [fetchAssessment]);

  /* Poll every 3s while processing */
  useEffect(() => {
    if (!polling) return;
    const iv = setInterval(async () => {
      const a = await fetchAssessment();
      if (a?.status !== 'processing') {
        setPolling(false);
        clearInterval(iv);
        if (a?.status === 'completed') toast.success('Assessment completed!');
        if (a?.status === 'failed')    toast.error('Assessment failed.');
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [polling, fetchAssessment]);

  const handleDownload = async () => {
    if (!assessment?.reportId) { toast.error('Report not ready yet'); return; }
    setDownloading(true);
    try {
      const res = await reportAPI.download(assessment.reportId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `MedCDS_Report_${assessment.reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded!');
    } catch { toast.error('Download failed'); }
    setDownloading(false);
  };

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!assessment) return (
    <div className="text-center text-slate-400 py-16">
      Assessment not found.{' '}
      <Link to="/dashboard" className="text-blue-400">Go to dashboard</Link>
    </div>
  );

  const isProcessing = assessment.status === 'processing';
  const isCompleted  = assessment.status === 'completed';
  const isFailed     = assessment.status === 'failed';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Assessment Results</h1>
          <p className="text-slate-400 mt-1 text-sm">{assessment.chiefComplaint}</p>
        </div>
        {isCompleted && assessment.reportGenerated && (
          <button onClick={handleDownload} disabled={downloading}
            className="btn-primary flex-shrink-0">
            {downloading
              ? <ArrowPathIcon className="w-5 h-5 animate-spin" />
              : <DocumentArrowDownIcon className="w-5 h-5" />}
            Download PDF
          </button>
        )}
      </div>

      {/* ── Processing state ── */}
      {isProcessing && (
        <div className="card p-8 flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🔬</div>
          </div>
          <div>
            <h3 className="font-display font-semibold text-white text-lg">
              Running Clinical Analysis
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Predicting diseases · Checking drug safety · Applying guidelines…
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs text-left">
            {[
              'Disease prediction (Infermedica + Isabel)',
              'Applying WHO / NICE / ICMR guidelines',
              'Multi-layer drug safety filters',
              'Generating PDF report',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
                     style={{ animationDelay: `${i * 0.25}s` }} />
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Failed state ── */}
      {isFailed && (
        <div className="card p-8 flex flex-col items-center text-center gap-4">
          <XCircleIcon className="w-12 h-12 text-red-400" />
          <div>
            <h3 className="font-display font-semibold text-white text-lg">Assessment Failed</h3>
            <p className="text-slate-400 text-sm mt-1">
              {assessment.processingErrors?.[0] || 'An error occurred during processing.'}
            </p>
          </div>
          <Link to="/assessment/new" className="btn-primary">Start New Assessment</Link>
        </div>
      )}

      {/* ── Completed results ── */}
      {isCompleted && (
        <>
          {/* Summary strip */}
          <div className="card p-5 flex flex-wrap items-center gap-6">
            <ConfidenceRing value={assessment.overallConfidence} />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label:'Conditions Identified', value: assessment.predictedDiseases?.length || 0,  color:'text-white'      },
                { label:'Medications Suggested',  value: assessment.suggestedDrugs?.length   || 0,  color:'text-green-400'  },
                { label:'Medications Excluded',   value: assessment.avoidedDrugs?.length     || 0,  color:'text-red-400'    },
                { label:'Data Warnings',          value: assessment.missingDataWarnings?.length || 0, color:'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 bg-amber-950/20
                          border border-amber-900/40 rounded-xl">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200/90">
              <strong>This is NOT a prescription.</strong> These are AI-generated clinical support
              suggestions based on symptom patterns and evidence-based guidelines.
              Consult a licensed doctor before taking any medication.
            </p>
          </div>

          {/* Predicted diseases */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-400" />
              <h2 className="section-title text-base">Predicted Conditions</h2>
            </div>
            <div className="p-5 space-y-3">
              {assessment.predictedDiseases?.length === 0 && (
                <p className="text-sm text-slate-400">
                  No conditions predicted. Add more symptoms for better accuracy.
                </p>
              )}
              {assessment.predictedDiseases?.map((d, i) => {
                const pct   = Math.round((d.confidenceScore || 0) * 100);
                const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
                const ring  = i === 0 ? 'border-blue-700/40 bg-blue-950/10'
                                      : 'border-slate-700/30 bg-slate-800/20';
                return (
                  <div key={i} className={`p-3.5 rounded-xl border ${ring}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center
                                         text-xs font-bold text-white flex-shrink-0
                                         ${i === 0 ? 'bg-blue-600' : 'bg-slate-600'}`}>
                          {i + 1}
                        </span>
                        <span className="font-medium text-slate-100 text-sm">{d.name}</span>
                        {d.icdCode && (
                          <span className="text-xs text-slate-500 font-mono">
                            ICD: {d.icdCode}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg text-white ${
                        pct >= 70 ? 'bg-green-700' : pct >= 40 ? 'bg-amber-700' : 'bg-red-700'
                      }`}>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`}
                           style={{ width:`${pct}%`, transition:'width 1s ease' }} />
                    </div>
                    {d.description && (
                      <p className="text-xs text-slate-500 mt-1.5">{d.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested drugs */}
          {assessment.suggestedDrugs?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <BeakerIcon className="w-5 h-5 text-green-400" />
                <h2 className="section-title text-base">Suggested Medications</h2>
                <span className="badge-success ml-auto">
                  {assessment.suggestedDrugs.length} minimum safe
                </span>
              </div>
              <div className="p-5 space-y-3">
                {assessment.suggestedDrugs.map((drug, i) => (
                  <DrugCard key={i} drug={drug} type="suggested" />
                ))}
              </div>
            </div>
          )}

          {assessment.suggestedDrugs?.length === 0 && (
            <div className="card p-6 text-center">
              <p className="text-slate-400 text-sm">
                No medications suggested — either no matching guideline rules or all candidates
                were excluded by safety filters. This is the safest outcome.
              </p>
            </div>
          )}

          {/* Avoided drugs */}
          {assessment.avoidedDrugs?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <ShieldExclamationIcon className="w-5 h-5 text-red-400" />
                <h2 className="section-title text-base">Medications Excluded for Safety</h2>
                <span className="badge-danger ml-auto">
                  {assessment.avoidedDrugs.length} excluded
                </span>
              </div>
              <div className="p-5 space-y-3">
                {assessment.avoidedDrugs.map((drug, i) => (
                  <DrugCard key={i} drug={drug} type="avoided" />
                ))}
              </div>
            </div>
          )}

          {/* Missing data warnings */}
          {assessment.missingDataWarnings?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
                <h2 className="section-title text-base">Data Completeness Warnings</h2>
              </div>
              <div className="p-5 space-y-3">
                {assessment.missingDataWarnings.map((w, i) => (
                  <div key={i} className={`p-3.5 rounded-xl border ${
                    w.severity === 'high'   ? 'border-red-900/40 bg-red-950/10'   :
                    w.severity === 'medium' ? 'border-amber-900/40 bg-amber-950/10' :
                                             'border-slate-700/40 bg-slate-800/20'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0">
                        {w.severity === 'high' ? '🔴' : w.severity === 'medium' ? '🟡' : '🟢'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{w.message}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Impact: {w.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link to="/profile"
                  className="inline-flex items-center gap-1 text-sm text-blue-400
                             hover:text-blue-300 mt-1">
                  Complete your profile to improve accuracy →
                </Link>
              </div>
            </div>
          )}

          {/* Safety flags */}
          {assessment.safetyFlags?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <span className="text-lg">🚩</span>
                <h2 className="section-title text-base">Safety Flags</h2>
              </div>
              <div className="p-5 space-y-2">
                {assessment.safetyFlags.map((f, i) => (
                  <div key={i} className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl">
                    <p className="text-sm font-semibold text-red-400">{f.flag}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{f.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical summary */}
          {assessment.clinicalSummary && (
            <div className="card p-5">
              <h2 className="section-title text-base mb-3">Clinical Summary</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {assessment.clinicalSummary}
              </p>
              {assessment.guidelinesApplied?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500 mb-2">Guidelines Applied:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assessment.guidelinesApplied.map((g, i) => (
                      <span key={i} className="badge-info text-xs">{g}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Download CTA */}
          {assessment.reportGenerated && (
            <div className="card p-5 flex flex-col sm:flex-row items-center gap-4">
              <DocumentArrowDownIcon className="w-10 h-10 text-blue-400 flex-shrink-0" />
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-white">Download Full PDF Report</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Includes all sections: diseases, drug reasoning, safety warnings,
                  avoided drugs, and clinical summary with disclaimer.
                </p>
              </div>
              <button onClick={handleDownload} disabled={downloading}
                className="btn-primary flex-shrink-0">
                {downloading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <DocumentArrowDownIcon className="w-5 h-5" />}
                Download PDF
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

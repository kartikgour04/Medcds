import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  DocumentArrowDownIcon, DocumentTextIcon,
  ArrowRightIcon, ExclamationTriangleIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await reportAPI.getAll();
        setReports(res.data.reports || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const download = async (reportId) => {
    setDownloading(reportId);
    try {
      const res = await reportAPI.download(reportId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `MedCDS_${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded!');
    } catch { toast.error('Download failed. Report may not be ready yet.'); }
    setDownloading(null);
  };

  const riskColor = (level) => ({
    low:      'badge-success',
    moderate: 'badge-warning',
    high:     'badge-danger',
    critical: 'badge-danger',
  }[level] || 'badge-info');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Clinical Reports</h1>
        <p className="text-slate-400 text-sm mt-1">
          All your clinical decision support reports
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/90">
          These reports are AI-generated for clinical decision support only.{' '}
          <strong>NOT prescriptions.</strong> Always consult a licensed doctor.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center h-32 items-center">
          <span className="w-7 h-7 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-slate-500 gap-3">
          <DocumentTextIcon className="w-12 h-12 opacity-30" />
          <p className="text-base font-medium text-slate-400">No reports yet</p>
          <p className="text-sm">Complete an assessment to generate your first report</p>
          <Link to="/assessment/new" className="btn-primary mt-2">Start Assessment</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r._id}
              className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-200 text-sm font-mono">
                    {r.reportId}
                  </span>
                  {r.summary?.overallRiskLevel && (
                    <span className={riskColor(r.summary.overallRiskLevel)}>
                      {r.summary.overallRiskLevel} risk
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 truncate">
                  {r.summary?.chiefComplaint || r.summary?.topDiagnosis || 'Clinical Assessment'}
                </p>
                {r.summary?.topDiagnosis && (
                  <p className="text-xs text-blue-400 mt-0.5">
                    Top: {r.summary.topDiagnosis}{' '}
                    ({Math.round((r.summary.diagnosisConfidence || 0) * 100)}%)
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" />
                    {r.summary?.drugsRecommended || 0} drugs suggested
                  </span>
                  {r.summary?.warningCount > 0 && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      {r.summary.warningCount} warnings
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {new Date(r.reportDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Link to={`/reports/${r.reportId}`} className="btn-secondary text-sm py-2 px-3">
                  View <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => download(r.reportId)}
                  disabled={downloading === r.reportId}
                  className="btn-primary text-sm py-2 px-3"
                >
                  {downloading === r.reportId
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <DocumentArrowDownIcon className="w-4 h-4" />}
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

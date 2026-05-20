import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  DocumentArrowDownIcon, ArrowLeftIcon,
  ExclamationTriangleIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report,      setReport]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await reportAPI.getById(id);
        setReport(res.data.report);
      } catch { toast.error('Report not found'); }
      setLoading(false);
    })();
  }, [id]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await reportAPI.download(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `MedCDS_${report?.reportId || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch { toast.error('Download failed'); }
    setDownloading(false);
  };

  if (loading) return (
    <div className="flex justify-center h-32 items-center">
      <span className="w-7 h-7 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!report) return (
    <div className="text-center text-slate-400 py-16">
      Report not found.{' '}
      <Link to="/reports" className="text-blue-400">Back to reports</Link>
    </div>
  );

  const summaryFields = [
    { label:'Patient',       value: report.patientName },
    { label:'Age',           value: report.patientAge ? `${report.patientAge} years` : '—' },
    { label:'Gender',        value: report.patientGender || '—' },
    { label:'Risk Level',    value: report.summary?.overallRiskLevel || '—' },
    { label:'Top Diagnosis', value: report.summary?.topDiagnosis || '—', wide: true },
    { label:'Confidence',    value: report.summary?.diagnosisConfidence
        ? `${Math.round(report.summary.diagnosisConfidence * 100)}%` : '—' },
    { label:'Drugs Suggested', value: report.summary?.drugsRecommended ?? '—' },
    { label:'Drugs Avoided',   value: report.summary?.drugsAvoided    ?? '—' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/reports"
            className="text-sm text-slate-500 hover:text-slate-300
                       flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" /> All Reports
          </Link>
          <h1 className="page-title font-mono">{report.reportId}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date(report.reportDate).toLocaleDateString('en-IN', {
              weekday:'long', day:'numeric', month:'long', year:'numeric',
            })}
          </p>
        </div>
        <button onClick={download} disabled={downloading} className="btn-primary flex-shrink-0">
          {downloading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <DocumentArrowDownIcon className="w-5 h-5" />}
          Download PDF
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/90">{report.disclaimer}</p>
      </div>

      {/* Summary grid */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Report Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryFields.map(({ label, value, wide }) => (
            <div key={label}
              className={`${wide ? 'col-span-2' : ''} p-3 bg-slate-800 rounded-xl`}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-semibold text-white mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Drug counts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-white">
              {report.summary?.drugsRecommended ?? 0}
            </p>
            <p className="text-xs text-slate-400">Drugs Suggested</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-white">
              {report.summary?.warningCount ?? 0}
            </p>
            <p className="text-xs text-slate-400">Data Warnings</p>
          </div>
        </div>
      </div>

      {/* Assessment link */}
      {report.assessmentId && (
        <div className="card p-5">
          <p className="text-sm text-slate-400 mb-3">
            View the full detailed assessment that generated this report:
          </p>
          <Link
            to={`/assessment/${report.assessmentId?._id || report.assessmentId}`}
            className="btn-secondary text-sm"
          >
            View Full Assessment →
          </Link>
        </div>
      )}

      {/* Download CTA */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <DocumentArrowDownIcon className="w-12 h-12 text-blue-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-white">Download Full PDF Report</p>
          <p className="text-sm text-slate-400 mt-0.5">
            Contains all sections: diseases, drug reasoning, avoided drugs,
            safety warnings, and clinical summary.
          </p>
        </div>
        <button onClick={download} disabled={downloading} className="btn-primary flex-shrink-0">
          {downloading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <DocumentArrowDownIcon className="w-5 h-5" />}
          Download PDF
        </button>
      </div>
    </div>
  );
}

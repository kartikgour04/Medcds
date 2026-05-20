import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentAPI, reportAPI } from '../services/api';
import useAuthStore from '../context/authStore';
import {
  PlusCircleIcon, DocumentTextIcon, ClipboardDocumentListIcon,
  ShieldCheckIcon, ArrowRightIcon, CheckCircleIcon, ClockIcon,
  XCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const StatusBadge = ({ status }) => {
  const map = {
    completed:       { cls: 'badge-success', label: 'Completed' },
    processing:      { cls: 'badge-info',    label: 'Processing' },
    failed:          { cls: 'badge-danger',  label: 'Failed' },
    requires_review: { cls: 'badge-warning', label: 'Review' },
  };
  const { cls, label } = map[status] || map.processing;
  return <span className={cls}>{label}</span>;
};

const ConfidenceBar = ({ value }) => {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`}
             style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-9 text-right">{pct}%</span>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [assessments, setAssessments] = useState([]);
  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [aRes, rRes] = await Promise.all([
          assessmentAPI.getAll({ limit: 5 }),
          reportAPI.getAll({ limit: 3 }),
        ]);
        setAssessments(aRes.data.assessments || []);
        setReports(rRes.data.reports || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { label: 'Total Assessments', value: assessments.length, icon: ClipboardDocumentListIcon, color: 'text-blue-400' },
    { label: 'Reports Generated',  value: reports.length,      icon: DocumentTextIcon,            color: 'text-green-400' },
    { label: 'Completed',          value: assessments.filter(a => a.status === 'completed').length, icon: CheckCircleIcon, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">
            {greeting},{' '}
            <span className="text-blue-400">{user?.firstName}</span>
          </h1>
          <p className="text-slate-400 mt-1">Your clinical decision support dashboard</p>
        </div>
        <Link to="/assessment/new" className="btn-primary">
          <PlusCircleIcon className="w-5 h-5" />
          New Assessment
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-amber-950/30 border border-amber-900/40 rounded-xl">
        <ShieldCheckIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/80">
          <strong className="font-semibold">Clinical Decision Support — Not a Prescription.</strong>{' '}
          MedCDS reports support clinical decisions only. Always consult a qualified
          healthcare professional before acting on any recommendation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{label}</p>
                <p className="text-3xl font-display font-bold text-white mt-1">
                  {loading ? '—' : value}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-slate-800 flex items-center
                              justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Assessments */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="section-title">Recent Assessments</h2>
          <Link to="/reports"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="w-6 h-6 border-2 border-slate-700 border-t-blue-500
                             rounded-full animate-spin" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <ClipboardDocumentListIcon className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No assessments yet</p>
            <Link to="/assessment/new"
              className="text-blue-400 text-sm mt-2 hover:text-blue-300">
              Start your first →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {assessments.map(a => (
              <Link key={a._id} to={`/assessment/${a._id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/40
                           transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {a.chiefComplaint || `Assessment #${a.assessmentNumber}`}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.predictedDiseases?.[0] && (
                    <p className="text-xs text-slate-500 mb-1.5 truncate">
                      Top: {a.predictedDiseases[0].name}
                    </p>
                  )}
                  <ConfidenceBar value={a.overallConfidence} />
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">
                    {new Date(a.createdAt).toLocaleDateString('en-IN',
                      { day: 'numeric', month: 'short' })}
                  </p>
                  {a.suggestedDrugs?.length > 0 && (
                    <p className="text-xs text-green-400 mt-1">
                      {a.suggestedDrugs.length} drug{a.suggestedDrugs.length > 1 ? 's' : ''} suggested
                    </p>
                  )}
                </div>
                <ArrowRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400
                                           transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/profile" className="card-hover p-5 flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-xl bg-blue-950 text-blue-400 flex
                          items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-slate-200 group-hover:text-white transition-colors">
              Complete Your Profile
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Add allergies, medications & conditions for accurate results
            </p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400
                                     ml-auto flex-shrink-0 transition-colors" />
        </Link>

        <Link to="/reports" className="card-hover p-5 flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-xl bg-green-950 text-green-400 flex
                          items-center justify-center flex-shrink-0">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-slate-200 group-hover:text-white transition-colors">
              View & Download Reports
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Access all your clinical support reports as PDF
            </p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400
                                     ml-auto flex-shrink-0 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

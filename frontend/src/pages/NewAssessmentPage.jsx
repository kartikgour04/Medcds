import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { assessmentAPI } from '../services/api';
import {
  PlusIcon, TrashIcon, ArrowRightIcon, ArrowLeftIcon,
  ExclamationTriangleIcon, SparklesIcon,
} from '@heroicons/react/24/outline';

const SYMPTOM_SUGGESTIONS = [
  'Fever', 'Headache', 'Cough', 'Sore throat', 'Fatigue', 'Body ache',
  'Runny nose', 'Nausea', 'Vomiting', 'Diarrhea', 'Chest pain', 'Shortness of breath',
  'Dizziness', 'Back pain', 'Abdominal pain', 'Loss of appetite', 'Joint pain',
  'Skin rash', 'Frequent urination', 'Excessive thirst', 'Weight loss', 'Blurred vision',
];

const STEP_LABELS = ['Chief Complaint', 'Symptoms', 'Lab Results', 'Review & Submit'];

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
            i < current ? 'bg-green-600 text-white' :
            i === current ? 'bg-blue-600 text-white ring-2 ring-blue-400/40' :
            'bg-slate-800 text-slate-500'
          }`}>{i < current ? '✓' : i + 1}</div>
          <div className="flex-1 text-xs text-slate-500 hidden sm:block">
            {i === current && <span className="text-slate-300 font-medium">{STEP_LABELS[i]}</span>}
          </div>
          {i < total - 1 && <div className={`w-8 h-0.5 rounded-full ${i < current ? 'bg-green-600' : 'bg-slate-700'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function NewAssessmentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [symptoms, setSymptoms] = useState([]);
  const [labText, setLabText] = useState('');
  const [chipInput, setChipInput] = useState('');
  const { register, handleSubmit, watch, getValues, formState: { errors } } = useForm();

  const addSymptom = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (symptoms.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setSymptoms(prev => [...prev, { name: trimmed, severity: 'moderate', present: true }]);
    setChipInput('');
  };

  const removeSymptom = (idx) => setSymptoms(prev => prev.filter((_, i) => i !== idx));

  const updateSymptomSeverity = (idx, severity) => {
    setSymptoms(prev => prev.map((s, i) => i === idx ? { ...s, severity } : s));
  };

  const handleFinalSubmit = async () => {
    if (symptoms.length === 0) {
      toast.error('Please add at least one symptom.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = getValues();
      const payload = {
        chiefComplaint: formData.chiefComplaint,
        symptoms,
        additionalNotes: formData.additionalNotes,
        labResults: labText ? [{ testName: 'Uploaded Report', value: labText, extractedByAI: false }] : [],
      };
      const res = await assessmentAPI.create(payload);
      toast.success('Assessment started! Processing in background…');
      navigate(`/assessment/${res.data.assessmentId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start assessment');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">New Assessment</h1>
        <p className="text-slate-400 mt-1 text-sm">Provide your symptoms for AI-assisted clinical analysis</p>
      </div>

      <div className="card p-6 lg:p-8">
        <StepIndicator current={step} total={4} />

        {/* Step 0: Chief Complaint */}
        {step === 0 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="section-title">What brings you in today?</h2>
            <div>
              <label className="label">Chief Complaint *</label>
              <textarea
                {...register('chiefComplaint', { required: 'Chief complaint is required' })}
                className="input h-28 resize-none"
                placeholder="e.g., Fever and body aches for the past 3 days with mild headache"
              />
              {errors.chiefComplaint && <p className="text-red-400 text-xs mt-1">{errors.chiefComplaint.message}</p>}
            </div>
            <div>
              <label className="label">Additional notes (optional)</label>
              <textarea
                {...register('additionalNotes')}
                className="input h-20 resize-none"
                placeholder="Any other relevant information for the clinician..."
              />
            </div>
            <div className="flex items-start gap-3 p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-xl">
              <SparklesIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300/90">
                The more detail you provide, the more accurate your clinical assessment will be. Include onset, duration, and severity.
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Symptoms */}
        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="section-title">Add Your Symptoms</h2>
            <div>
              <label className="label">Type a symptom and press Enter</label>
              <div className="flex gap-2">
                <input
                  value={chipInput}
                  onChange={e => setChipInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSymptom(chipInput); } }}
                  className="input flex-1"
                  placeholder="e.g., Headache, Fever, Cough..."
                />
                <button type="button" onClick={() => addSymptom(chipInput)} className="btn-secondary px-4">
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_SUGGESTIONS.filter(s => !symptoms.some(sy => sy.name === s)).slice(0, 12).map(s => (
                  <button key={s} type="button" onClick={() => addSymptom(s)}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors">
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Added symptoms */}
            {symptoms.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Added symptoms ({symptoms.length})</p>
                {symptoms.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-slate-200 font-medium">{s.name}</span>
                    <select
                      value={s.severity}
                      onChange={e => updateSymptomSeverity(i, e.target.value)}
                      className="text-xs bg-slate-700 border border-slate-600 text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    <button type="button" onClick={() => removeSymptom(i)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {symptoms.length === 0 && (
              <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                <p className="text-sm">No symptoms added yet</p>
                <p className="text-xs mt-1">Add at least one symptom to continue</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Lab Results */}
        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="section-title">Lab Reports (Optional)</h2>
            <div className="p-4 bg-blue-950/20 border border-blue-900/40 rounded-xl">
              <p className="text-sm text-blue-300">
                Paste text from lab reports (blood work, urinalysis, etc.). Our AI will extract structured values automatically.
              </p>
            </div>
            <div>
              <label className="label">Paste lab report text</label>
              <textarea
                value={labText}
                onChange={e => setLabText(e.target.value)}
                className="input h-48 resize-none font-mono text-xs"
                placeholder={`Example:\nHemoglobin: 11.2 g/dL (Normal: 12-16)\nBlood Glucose (Fasting): 126 mg/dL (Normal: 70-100) - HIGH\nCreatinine: 0.9 mg/dL (Normal: 0.6-1.2)\nALT: 32 U/L (Normal: 7-40)\n...`}
              />
            </div>
            <div className="flex items-start gap-3 p-3.5 bg-slate-800 rounded-xl border border-slate-700">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                Lab results improve assessment accuracy significantly — especially for renal function, blood glucose, and liver function. If not provided, safety warnings will be added to your report.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="section-title">Review & Submit</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Chief Complaint</p>
                <p className="text-sm text-slate-200">{getValues('chiefComplaint')}</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Symptoms ({symptoms.length})</p>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((s, i) => (
                    <span key={i} className={`text-xs px-2.5 py-1 rounded-full border ${
                      s.severity === 'severe' ? 'bg-red-950/30 text-red-400 border-red-900/40' :
                      s.severity === 'moderate' ? 'bg-amber-950/30 text-amber-400 border-amber-900/40' :
                      'bg-green-950/30 text-green-400 border-green-900/40'
                    }`}>{s.name} • {s.severity}</span>
                  ))}
                </div>
              </div>
              {labText && (
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Lab Report</p>
                  <p className="text-xs text-green-400">✓ Lab report text provided ({labText.length} characters)</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl">
              <p className="text-sm font-semibold text-amber-300 mb-1">⚠️ Important Reminder</p>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                The clinical support report generated is <strong>NOT a prescription or diagnosis</strong>. It is an AI-assisted analysis based on symptom patterns, clinical guidelines, and drug safety databases. Always consult a qualified healthcare professional before taking any medication.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
          <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0}
            className="btn-secondary disabled:opacity-40">
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button type="button" onClick={() => {
              if (step === 0 && !watch('chiefComplaint')) {
                toast.error('Please enter your chief complaint'); return;
              }
              if (step === 1 && symptoms.length === 0) {
                toast.error('Please add at least one symptom'); return;
              }
              setStep(s => s + 1);
            }} className="btn-primary">
              Next <ArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleFinalSubmit} disabled={submitting} className="btn-primary">
              {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
              {submitting ? 'Submitting…' : 'Run Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

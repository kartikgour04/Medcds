import React, { useEffect, useState } from 'react';
import { patientAPI } from '../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon, TrashIcon, CheckCircleIcon, ShieldExclamationIcon,
  BeakerIcon, HeartIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: HeartIcon },
  { id: 'allergies',   label: 'Allergies',   icon: ShieldExclamationIcon },
  { id: 'medications', label: 'Medications', icon: BeakerIcon },
  { id: 'conditions',  label: 'Conditions',  icon: ClipboardDocumentListIcon },
  { id: 'vitals',      label: 'Vitals',      icon: CheckCircleIcon },
];

const DataBadge = ({ complete }) => (
  <span className={complete ? 'badge-success ml-auto' : 'badge-warning ml-auto'}>
    {complete ? 'Complete' : 'Missing'}
  </span>
);

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [tab,     setTab]     = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const [showAddAllergy,  setShowAddAllergy]  = useState(false);
  const [showAddMed,      setShowAddMed]      = useState(false);
  const [showAddCond,     setShowAddCond]     = useState(false);
  const [showAddVitals,   setShowAddVitals]   = useState(false);

  const overviewForm = useForm();
  const allergyForm  = useForm();
  const medForm      = useForm();
  const condForm     = useForm();
  const vitalsForm   = useForm();

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await patientAPI.getProfile();
      const p   = res.data.profile;
      setProfile(p);
      overviewForm.reset({
        bloodType:         p.bloodType         || '',
        smokingStatus:     p.smokingStatus     || '',
        alcoholUse:        p.alcoholUse        || '',
        exerciseFrequency: p.exerciseFrequency || '',
        diet:              p.diet              || '',
        occupation:        p.occupation        || '',
      });
    } catch (e) {
      toast.error('Could not load profile');
    }
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, []);

  const saveOverview = async (data) => {
    setSaving(true);
    try {
      await patientAPI.updateProfile(data);
      toast.success('Profile updated');
      loadProfile();
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const addAllergy = async (data) => {
    try {
      await patientAPI.addAllergy(data);
      toast.success('Allergy added');
      setShowAddAllergy(false);
      allergyForm.reset();
      loadProfile();
    } catch { toast.error('Failed to add allergy'); }
  };

  const addMedication = async (data) => {
    try {
      await patientAPI.addMedication(data);
      toast.success('Medication added');
      setShowAddMed(false);
      medForm.reset();
      loadProfile();
    } catch { toast.error('Failed to add medication'); }
  };

  const addCondition = async (data) => {
    try {
      await patientAPI.addCondition(data);
      toast.success('Condition added');
      setShowAddCond(false);
      condForm.reset();
      loadProfile();
    } catch { toast.error('Failed to add condition'); }
  };

  const addVitals = async (data) => {
    try {
      await patientAPI.addVitalSigns(data);
      toast.success('Vitals saved');
      setShowAddVitals(false);
      vitalsForm.reset();
      loadProfile();
    } catch { toast.error('Failed to save vitals'); }
  };

  const removeItem = async (type, id) => {
    try {
      if (type === 'allergy') await patientAPI.removeAllergy(id);
      if (type === 'med')     await patientAPI.removeMedication(id);
      if (type === 'cond')    await patientAPI.removeCondition(id);
      toast.success('Removed');
      loadProfile();
    } catch { toast.error('Failed to remove'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const comp          = profile?.dataCompleteness || {};
  const filled        = Object.values(comp).filter(Boolean).length;
  const total         = Object.keys(comp).length || 6;
  const completePct   = Math.round((filled / total) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Medical Profile</h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete your profile for more accurate and safe assessments
        </p>
      </div>

      {/* Completeness bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-300">Profile Completeness</span>
          <span className="text-sm font-bold text-white">{completePct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${completePct}%`,
              background: 'linear-gradient(90deg,#2563eb,#16a34a)',
            }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          A complete profile enables better drug safety checks and more accurate assessments
        </p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                        whitespace-nowrap transition-all ${
              tab === id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="card p-6">
          <h2 className="section-title mb-5">General Health Information</h2>
          <form onSubmit={overviewForm.handleSubmit(saveOverview)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { name:'bloodType', label:'Blood Type',
                opts:['','A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'] },
              { name:'smokingStatus', label:'Smoking Status',
                opts:['','never','former','current','unknown'] },
              { name:'alcoholUse', label:'Alcohol Use',
                opts:['','none','occasional','moderate','heavy','unknown'] },
              { name:'exerciseFrequency', label:'Exercise Frequency',
                opts:['','sedentary','light','moderate','active','very_active'] },
              { name:'diet', label:'Diet',
                opts:['','omnivore','vegetarian','vegan','other'] },
            ].map(({ name, label, opts }) => (
              <div key={name}>
                <label className="label">{label}</label>
                <select {...overviewForm.register(name)} className="input">
                  {opts.map(v => (
                    <option key={v} value={v}>
                      {v ? v.charAt(0).toUpperCase() + v.slice(1).replace('_',' ') : 'Select…'}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label className="label">Occupation</label>
              <input {...overviewForm.register('occupation')}
                className="input" placeholder="e.g., Engineer, Teacher" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <CheckCircleIcon className="w-5 h-5"/>}
                Save Overview
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ALLERGIES ── */}
      {tab === 'allergies' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="section-title">Known Allergies</h2>
            <div className="flex items-center gap-3">
              <DataBadge complete={comp.allergies} />
              <button onClick={() => setShowAddAllergy(v => !v)} className="btn-secondary py-1.5 px-3 text-sm">
                <PlusIcon className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {showAddAllergy && (
            <form onSubmit={allergyForm.handleSubmit(addAllergy)}
                  className="p-5 bg-slate-800/40 border-b border-slate-700 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label text-xs">Substance / Drug Name *</label>
                <input {...allergyForm.register('substance', { required: true })}
                  className="input" placeholder="e.g., Penicillin, Aspirin, Peanuts" />
              </div>
              <div>
                <label className="label text-xs">Type</label>
                <select {...allergyForm.register('type')} className="input">
                  <option value="drug">Drug</option>
                  <option value="food">Food</option>
                  <option value="environmental">Environmental</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Severity</label>
                <select {...allergyForm.register('severity')} className="input">
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="life-threatening">Life-threatening</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label text-xs">Reaction Description</label>
                <input {...allergyForm.register('reaction')}
                  className="input" placeholder="e.g., Rash, Hives, Anaphylaxis" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" className="btn-primary text-sm">Save Allergy</button>
                <button type="button" onClick={() => setShowAddAllergy(false)}
                  className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-800">
            {!profile?.allergies?.length ? (
              <div className="flex flex-col items-center py-10 text-slate-500">
                <ShieldExclamationIcon className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No allergies recorded</p>
                <p className="text-xs mt-1 text-amber-400">
                  ⚠ Missing allergy data increases safety risk in assessments
                </p>
              </div>
            ) : profile.allergies.map(a => (
              <div key={a._id} className="flex items-center gap-4 px-6 py-4">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  a.severity === 'life-threatening' ? 'bg-red-500' :
                  a.severity === 'severe'           ? 'bg-red-400' :
                  a.severity === 'moderate'         ? 'bg-amber-400' : 'bg-green-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm">{a.substance}</p>
                  <p className="text-xs text-slate-500">
                    {a.type} — {a.severity}{a.reaction ? ` — ${a.reaction}` : ''}
                  </p>
                </div>
                <button onClick={() => removeItem('allergy', a._id)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500
                             hover:text-red-400 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MEDICATIONS ── */}
      {tab === 'medications' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="section-title">Current Medications</h2>
            <div className="flex items-center gap-3">
              <DataBadge complete={comp.medications} />
              <button onClick={() => setShowAddMed(v => !v)} className="btn-secondary py-1.5 px-3 text-sm">
                <PlusIcon className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {showAddMed && (
            <form onSubmit={medForm.handleSubmit(addMedication)}
                  className="p-5 bg-slate-800/40 border-b border-slate-700 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label text-xs">Medication Name *</label>
                <input {...medForm.register('name', { required: true })}
                  className="input" placeholder="e.g., Metformin, Amlodipine" />
              </div>
              <div>
                <label className="label text-xs">Dosage</label>
                <input {...medForm.register('dosage')} className="input" placeholder="e.g., 500mg" />
              </div>
              <div>
                <label className="label text-xs">Frequency</label>
                <input {...medForm.register('frequency')} className="input" placeholder="e.g., Twice daily" />
              </div>
              <div>
                <label className="label text-xs">Start Date</label>
                <input {...medForm.register('startDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label text-xs">Reason / Condition</label>
                <input {...medForm.register('reason')} className="input" placeholder="e.g., Diabetes" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" className="btn-primary text-sm">Save Medication</button>
                <button type="button" onClick={() => setShowAddMed(false)}
                  className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-800">
            {!profile?.currentMedications?.filter(m => m.active)?.length ? (
              <div className="flex flex-col items-center py-10 text-slate-500">
                <BeakerIcon className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No current medications recorded</p>
                <p className="text-xs mt-1 text-slate-400">
                  Add medications to enable drug-drug interaction checks
                </p>
              </div>
            ) : profile.currentMedications.filter(m => m.active).map(m => (
              <div key={m._id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm">{m.name}</p>
                  <p className="text-xs text-slate-500">
                    {[m.dosage, m.frequency, m.reason].filter(Boolean).join(' — ')}
                  </p>
                </div>
                <button onClick={() => removeItem('med', m._id)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500
                             hover:text-red-400 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONDITIONS ── */}
      {tab === 'conditions' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="section-title">Medical Conditions</h2>
            <div className="flex items-center gap-3">
              <DataBadge complete={comp.conditions} />
              <button onClick={() => setShowAddCond(v => !v)} className="btn-secondary py-1.5 px-3 text-sm">
                <PlusIcon className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {showAddCond && (
            <form onSubmit={condForm.handleSubmit(addCondition)}
                  className="p-5 bg-slate-800/40 border-b border-slate-700 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label text-xs">Condition Name *</label>
                <input {...condForm.register('name', { required: true })}
                  className="input" placeholder="e.g., Type 2 Diabetes, Hypertension, Asthma" />
              </div>
              <div>
                <label className="label text-xs">ICD-10 Code (optional)</label>
                <input {...condForm.register('icdCode')} className="input" placeholder="e.g., E11, I10" />
              </div>
              <div>
                <label className="label text-xs">Status</label>
                <select {...condForm.register('status')} className="input">
                  <option value="active">Active</option>
                  <option value="chronic">Chronic</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Diagnosed Date</label>
                <input {...condForm.register('diagnosedDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label text-xs">Notes</label>
                <input {...condForm.register('notes')} className="input" placeholder="Optional notes" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" className="btn-primary text-sm">Save Condition</button>
                <button type="button" onClick={() => setShowAddCond(false)}
                  className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-800">
            {!profile?.conditions?.length ? (
              <div className="flex flex-col items-center py-10 text-slate-500">
                <ClipboardDocumentListIcon className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No conditions recorded</p>
                <p className="text-xs mt-1 text-slate-400">
                  Known conditions affect drug contraindication rules
                </p>
              </div>
            ) : profile.conditions.map(c => (
              <div key={c._id} className="flex items-center gap-4 px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                  c.status === 'active'  ? 'bg-red-950/50 text-red-400' :
                  c.status === 'chronic' ? 'bg-amber-950/50 text-amber-400' :
                                          'bg-slate-700 text-slate-400'
                }`}>{c.status}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm">{c.name}</p>
                  {c.icdCode && <p className="text-xs text-slate-500">ICD: {c.icdCode}</p>}
                </div>
                <button onClick={() => removeItem('cond', c._id)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500
                             hover:text-red-400 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VITALS ── */}
      {tab === 'vitals' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="section-title">Vital Signs</h2>
            <div className="flex items-center gap-3">
              <DataBadge complete={comp.vitals} />
              <button onClick={() => setShowAddVitals(v => !v)} className="btn-secondary py-1.5 px-3 text-sm">
                <PlusIcon className="w-4 h-4" /> Record
              </button>
            </div>
          </div>

          {showAddVitals && (
            <form onSubmit={vitalsForm.handleSubmit(addVitals)}
                  className="p-5 bg-slate-800/40 border-b border-slate-700 grid grid-cols-2 gap-4">
              {[
                { name:'height',                label:'Height (cm)',        placeholder:'170' },
                { name:'weight',                label:'Weight (kg)',         placeholder:'70'  },
                { name:'bloodPressureSystolic', label:'BP Systolic (mmHg)', placeholder:'120' },
                { name:'bloodPressureDiastolic',label:'BP Diastolic (mmHg)',placeholder:'80'  },
                { name:'heartRate',             label:'Heart Rate (bpm)',    placeholder:'72'  },
                { name:'temperature',           label:'Temperature (°C)',    placeholder:'37.0'},
                { name:'oxygenSaturation',      label:'SpO2 (%)',            placeholder:'98'  },
                { name:'bloodGlucose',          label:'Blood Glucose (mg/dL)',placeholder:'90' },
              ].map(({ name, label, placeholder }) => (
                <div key={name}>
                  <label className="label text-xs">{label}</label>
                  <input
                    {...vitalsForm.register(name)}
                    type="number" step="0.1"
                    className="input"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="col-span-2 flex gap-2">
                <button type="submit" className="btn-primary text-sm">Save Vitals</button>
                <button type="button" onClick={() => setShowAddVitals(false)}
                  className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          )}

          {profile?.vitalSigns?.length > 0 ? (() => {
            const v = profile.vitalSigns[profile.vitalSigns.length - 1];
            return (
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label:'Height',         value: v.height?.value       ? `${v.height.value} cm`          : '—' },
                    { label:'Weight',         value: v.weight?.value       ? `${v.weight.value} kg`          : '—' },
                    { label:'BMI',            value: v.bmi                 ? `${v.bmi}`                      : '—' },
                    { label:'Blood Pressure', value: v.bloodPressureSystolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg` : '—' },
                    { label:'Heart Rate',     value: v.heartRate           ? `${v.heartRate} bpm`            : '—' },
                    { label:'Temperature',    value: v.temperature?.value  ? `${v.temperature.value} °C`     : '—' },
                    { label:'SpO2',           value: v.oxygenSaturation    ? `${v.oxygenSaturation}%`        : '—' },
                    { label:'Blood Glucose',  value: v.bloodGlucose        ? `${v.bloodGlucose} mg/dL`       : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-lg font-bold text-white mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-3">
                  Last recorded:{' '}
                  {new Date(v.recordedAt).toLocaleDateString('en-IN', {
                    day:'numeric', month:'short', year:'numeric',
                  })}
                </p>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center py-10 text-slate-500">
              <CheckCircleIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No vitals recorded yet</p>
              <p className="text-xs mt-1 text-slate-400">
                Vitals help with weight-based dosing and blood pressure assessments
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

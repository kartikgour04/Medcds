import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) { toast.success('Welcome back!'); navigate('/dashboard'); }
    else toast.error(result.message);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 p-12
                      border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg,#2563eb,#16a34a)' }}>⚕️</div>
          <span className="font-display font-bold text-white text-xl">MedCDS</span>
        </div>

        <div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Clinical Decision<br />Support System
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            AI-powered health assessments with evidence-based clinical guidelines
            and comprehensive drug safety filters.
          </p>
          <div className="space-y-3">
            {[
              { icon: '🔬', text: 'Disease prediction via Infermedica & Isabel' },
              { icon: '💊', text: 'Drug safety checks with FDA & RxNorm data' },
              { icon: '📋', text: 'WHO, NICE & ICMR clinical guidelines' },
              { icon: '🛡️', text: 'Multi-layer allergy & interaction filters' },
              { icon: '📄', text: 'Downloadable clinical support PDF report' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-amber-950/40 border border-amber-900/40 rounded-xl">
          <ShieldCheckIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80">
            <strong>NOT a prescription system.</strong> Always consult a qualified healthcare professional
            before taking any medication.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                 style={{ background: 'linear-gradient(135deg,#2563eb,#16a34a)' }}>⚕️</div>
            <span className="font-display font-bold text-white text-lg">MedCDS</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-slate-400 mb-8 text-sm">
            Enter your credentials to access your health dashboard.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
                })}
                type="email" className="input" placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-11" placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                             hover:text-slate-300 transition-colors">
                  {showPassword
                    ? <EyeSlashIcon className="w-5 h-5" />
                    : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin" />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Create account
            </Link>
          </p>

          {/* Demo hint */}
          <div className="mt-6 p-3 bg-slate-800 border border-slate-700 rounded-xl">
            <p className="text-xs text-slate-400 text-center">
              New here? <Link to="/register" className="text-blue-400">Create a free account</Link> to
              get started — no API keys required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

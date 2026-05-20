import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function RegisterPage() {
  const { register: registerUser, loading } = useAuthStore();
  const navigate   = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    const result = await registerUser({
      email:       data.email,
      password:    data.password,
      firstName:   data.firstName,
      lastName:    data.lastName,
      dateOfBirth: data.dateOfBirth || undefined,
      gender:      data.gender      || undefined,
      phoneNumber: data.phoneNumber || undefined,
    });
    if (result.success) {
      toast.success('Account created! Welcome to MedCDS.');
      navigate('/profile');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
               style={{ background: 'linear-gradient(135deg,#2563eb,#16a34a)' }}>⚕️</div>
          <span className="font-display font-bold text-white text-xl">MedCDS</span>
        </div>

        <div className="card p-8">
          <h2 className="font-display text-2xl font-bold text-white mb-1">Create account</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Set up your patient account to get started.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input {...register('firstName', { required: 'Required' })}
                  className="input" placeholder="John" />
                {errors.firstName && (
                  <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="label">Last name</label>
                <input {...register('lastName', { required: 'Required' })}
                  className="input" placeholder="Doe" />
                {errors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input {...register('email', {
                required: 'Email required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
              })} type="email" className="input" placeholder="you@example.com" />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date of birth</label>
                <input {...register('dateOfBirth')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Gender</label>
                <select {...register('gender')} className="input">
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Phone number (optional)</label>
              <input {...register('phoneNumber')} type="tel"
                className="input" placeholder="+91 98765 43210" />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password', {
                  required: 'Required',
                  minLength: { value: 8, message: 'Min 8 characters' },
                })} type={showPwd ? 'text' : 'password'}
                  className="input pr-11" placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-500 hover:text-slate-300 transition-colors">
                  {showPwd
                    ? <EyeSlashIcon className="w-5 h-5" />
                    : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input {...register('confirmPassword', {
                required: 'Required',
                validate: v => v === watch('password') || 'Passwords do not match',
              })} type="password" className="input" placeholder="Repeat password" />
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-900/40 rounded-xl">
              <p className="text-xs text-amber-300/80">
                ⚠️ By registering, you understand that MedCDS provides clinical
                decision support only and does <strong>NOT</strong> replace professional medical advice.
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3">
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin" />
              )}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

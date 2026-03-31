'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Key, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle, Shield, Lock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password visibility state
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password strength calculation
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 10;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[!@#$%^&*]/.test(password)) strength += 15;
    return Math.min(strength, 100);
  };

  const getStrengthColor = (strength: number): string => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (strength: number): string => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    return 'Strong';
  };

  const passwordStrength = calculatePasswordStrength(formData.newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await apiClient.post('/api/user/reset-password', formData);
      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:opacity-80"
          style={{ color: '#9090a8' }}
        >
          <ArrowLeft className="h-4 w-4" />
          ← Profile
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Key className="h-7 w-7" style={{ color: '#4f6ef7' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Reset Password</h1>
          </div>
          <p className="text-sm" style={{ color: '#9090a8' }}>Update your account password</p>
        </div>

        {/* Security Notice */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}
        >
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#4f6ef7' }} />
            <div>
              <h3 className="font-semibold text-sm" style={{ color: '#ededf5' }}>Password Security</h3>
              <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
                Choose a strong password that includes uppercase letters, lowercase letters, numbers, and special characters.
              </p>
            </div>
          </div>
        </div>

        {/* Reset Form */}
        <div
          className="rounded-xl p-6"
          style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
        >
          <h3 className="text-base font-semibold mb-6" style={{ color: '#ededf5' }}>Change Password</h3>

          {/* Success Message */}
          {success && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-4"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#22c55e' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#22c55e' }}>Password updated successfully!</p>
                <p className="text-xs" style={{ color: '#9090a8' }}>Redirecting to profile...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                Current Password <span style={{ color: '#9090a8' }}>(Optional)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9090a8' }} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleChange('currentPassword', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl pl-10 pr-12 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm transition-colors"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: '#9090a8' }}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#9090a8' }}>
                Leave blank if you signed in with a magic link
              </p>
            </div>

            {/* New Password */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9090a8' }} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl pl-10 pr-12 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm transition-colors"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: '#9090a8' }}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#9090a8' }}>Password Strength:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength < 40 ? 'text-red-400' : passwordStrength < 70 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {getStrengthLabel(passwordStrength)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium" style={{ color: '#9090a8' }}>Password must contain:</p>
                <div className="grid grid-cols-2 gap-1">
                  <div className={`text-xs flex items-center gap-1 ${formData.newPassword.length >= 8 ? 'text-green-400' : ''}`}
                    style={formData.newPassword.length >= 8 ? {} : { color: '#9090a8' }}>
                    <span className="text-[10px]">{formData.newPassword.length >= 8 ? '✓' : '○'}</span>
                    At least 8 characters
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${/[A-Z]/.test(formData.newPassword) ? 'text-green-400' : ''}`}
                    style={/[A-Z]/.test(formData.newPassword) ? {} : { color: '#9090a8' }}>
                    <span className="text-[10px]">{/[A-Z]/.test(formData.newPassword) ? '✓' : '○'}</span>
                    One uppercase letter
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${/[0-9]/.test(formData.newPassword) ? 'text-green-400' : ''}`}
                    style={/[0-9]/.test(formData.newPassword) ? {} : { color: '#9090a8' }}>
                    <span className="text-[10px]">{/[0-9]/.test(formData.newPassword) ? '✓' : '○'}</span>
                    One number
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${/[!@#$%^&*]/.test(formData.newPassword) ? 'text-green-400' : ''}`}
                    style={/[!@#$%^&*]/.test(formData.newPassword) ? {} : { color: '#9090a8' }}>
                    <span className="text-[10px]">{/[!@#$%^&*]/.test(formData.newPassword) ? '✓' : '○'}</span>
                    One special character
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9090a8' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl pl-10 pr-12 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm transition-colors"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: '#9090a8' }}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
                style={{ border: '1px solid #1e1e30', color: '#9090a8', background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.newPassword || !formData.confirmPassword || formData.newPassword !== formData.confirmPassword}
                className="flex-1 flex items-center justify-center gap-2 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

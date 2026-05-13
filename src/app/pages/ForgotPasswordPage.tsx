// src/app/pages/ForgotPasswordPage.tsx
import { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Simply call resetPasswordForEmail - Supabase handles everything
      // No need to check if email exists first (it's a security feature)
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (error) throw error;

      // Always show success message for security (prevents email enumeration)
      setSuccess(t('Password reset link sent! Check your email.'));
      setEmail('');
    } catch (err: any) {
      setError(err.message || t('Failed to send reset link'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-12 bg-[#009639]" />
              <div className="w-1.5 h-12 bg-[#ffd700]" />
              <div className="w-1.5 h-12 bg-[#da121a]" />
            </div>
            <h1 className="text-4xl text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
              EPL
            </h1>
          </div>
          <h2 className="text-2xl text-white mb-2">{t('Forgot Password?')}</h2>
          <p className="text-gray-400">{t('Enter your email to receive a reset link')}</p>
        </div>

        <div className="rounded-xl p-6" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-500 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-500 text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Email Address')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white"
                  style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-black font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{ background: '#ffd700', fontFamily: 'Inter, sans-serif', fontWeight: 800 }}
            >
              {loading ? t('Sending...') : t('Send Reset Link')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              {t('Back to Login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
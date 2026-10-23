import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { BrandLockup } from '../components/BrandLockup';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, loginWithGoogle, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
    }
  }, [authLoading, navigate, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email.includes('@') || !email.includes('.')) {
      setError(t('Please enter a valid email address'));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters'));
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const { data: profile } = authUser
        ? await supabase.from('profiles').select('role').eq('id', authUser.id).maybeSingle()
        : { data: null };

      setSuccess(t('Login successful! Redirecting...'));
      const redirectPath = profile?.role === 'admin' ? '/admin' : '/';
      setTimeout(() => navigate(redirectPath, { replace: true }), 800);
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError(t('Invalid email or password. Please check your credentials or create an account.'));
      } else if (err.message.includes('Email not confirmed')) {
        setError(t('Please verify your email before logging in. Check your inbox for the confirmation link.'));
      } else {
        setError(err.message || t('Login failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || t('Google login failed'));
      setSocialLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-[#0a0e1a]">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ffd700 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #009639 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #da121a 0%, transparent 70%)' }}
        />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('Back to Home')}</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <BrandLockup size="lg" />
          </div>
          <p className="text-gray-400">{t('Welcome back to Ethiopian Premier League')}</p>
        </div>

        <div
          className="rounded-xl p-6"
          style={{
            background: 'rgba(26, 31, 46, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h2 className="text-2xl text-white mb-6" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>
            {t('Sign In')}
          </h2>

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

          {/* Google Login Button with Google Logo */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={socialLoading}
              className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-3 hover:scale-[1.02] disabled:opacity-50 bg-white text-gray-700 hover:bg-gray-50"
            >
              {/* Google Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {socialLoading ? t('Redirecting...') : t('Continue with Google')}
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1a1f2e] text-gray-400">{t('Or continue with email')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white"
                  style={{
                    background: 'rgba(10, 14, 26, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg text-white"
                  style={{
                    background: 'rgba(10, 14, 26, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  placeholder="******** (min 6 characters)"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-[#ffd700] hover:underline transition-colors">
                {t('Forgot password?')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-black font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{
                background: '#ffd700',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
              }}
            >
              {loading ? t('Signing in...') : t('Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {t(`Don't have an account?`)}{' '}
              <Link to="/signup" className="text-[#ffd700] font-semibold hover:underline">
                {t('Create Account')}
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">{t('Forgot your password? Click the link above to reset it.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
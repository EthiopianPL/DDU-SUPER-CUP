import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Heart, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../lib/supabase';

interface Team {
  id: number;
  name: string;
  short_name: string;
}

export function SignupPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch teams from database
  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, short_name')
        .order('name');

      if (!error && data) {
        setTeams(data);
      }
    };

    fetchTeams();
  }, []);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!name.trim()) {
      setError(t('Please enter your full name'));
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError(t('Please enter a valid email address'));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters'));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match'));
      setLoading(false);
      return;
    }

    try {
      await signup(name, email, password, favoriteTeam);
      setSuccess(t('Account created! Please check your email for verification link before logging in.'));
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      if (err.message.includes('User already registered')) {
        setError(t('An account with this email already exists. Please login instead.'));
      } else {
        setError(err.message || t('Failed to create account'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('Back to Home')}</span>
          </Link>
        </div>

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
          <p className="text-gray-400">{t('Join the Ethiopian Premier League community')}</p>
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
            {t('Create Account')}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Full Name')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white"
                  style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  placeholder={t('Enter your full name')}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Email Address')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white"
                  style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{t("We'll send a verification link to this email")}</p>
            </div>

            {/* Password with visibility toggle */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Password (min 6 characters)')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg text-white"
                  style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  placeholder={t('Enter your password')}
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

            {/* Confirm Password with visibility toggle */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Confirm Password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg text-white"
                  style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  placeholder={t('Confirm your password')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Favorite Team from Database */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('Favorite Team (Optional)')}</label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={favoriteTeam}
                  onChange={(event) => setFavoriteTeam(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white appearance-none cursor-pointer"
                  style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  <option value="">{t('Select a team')}</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              {teams.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">{t('Loading teams...')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-black font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{ background: '#ffd700', fontFamily: 'Inter, sans-serif', fontWeight: 800 }}
            >
              {loading ? t('Creating account...') : t('Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {t('Already have an account?')}{' '}
              <Link to="/login" className="text-[#ffd700] font-semibold hover:underline">
                {t('Sign In')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
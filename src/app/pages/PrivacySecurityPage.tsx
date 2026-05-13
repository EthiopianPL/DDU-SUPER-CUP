import { useNavigate } from 'react-router';
import { ArrowLeft, Shield, KeyRound, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function PrivacySecurityPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="pb-20">
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={() => navigate('/profile')}
          className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t('Back to Profile')}</span>
        </button>

        <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
          <Shield className="w-8 h-8 text-[#ffd700]" />
          {t('Privacy & Security')}
        </h1>
        <p className="text-gray-400">{t('Access the account actions that are currently available.')}</p>
      </div>

      <div className="px-4 space-y-3">
        {isAuthenticated ? (
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors"
            style={{ background: 'rgba(26, 31, 46, 0.8)' }}
          >
            <KeyRound className="w-5 h-5 text-[#ffd700]" />
            <div>
              <p className="text-white font-semibold">{t('Reset Password')}</p>
              <p className="text-xs text-gray-400">{t('Request a secure password reset link.')}</p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors"
            style={{ background: 'rgba(26, 31, 46, 0.8)' }}
          >
            <LogIn className="w-5 h-5 text-[#ffd700]" />
            <div>
              <p className="text-white font-semibold">{t('Sign In')}</p>
              <p className="text-xs text-gray-400">{t('Log in to manage your account security.')}</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

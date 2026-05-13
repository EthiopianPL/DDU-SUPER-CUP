import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { User, Heart, LogOut, Shield, Bell, Star, Newspaper } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function ProfilePage() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pb-20">
        <div className="w-8 h-8 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pb-20">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl text-white mb-2">{t('Sign in to continue')}</h2>
          <p className="text-gray-400 mb-6">{t('Access your profile, favorites, and personalized content')}</p>
          <div className="space-y-3">
            <button onClick={() => navigate('/login')} className="w-full px-6 py-3 rounded-lg text-black font-semibold" style={{ background: '#ffd700' }}>{t('Sign In')}</button>
            <button onClick={() => navigate('/signup')} className="w-full px-6 py-3 rounded-lg text-white font-semibold" style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>{t('Create Account')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>{t('Profile')}</h1>
        <p className="text-gray-400">{t('Manage your account')}</p>
      </div>

      <div className="px-4 mb-6">
        <div className="rounded-xl p-6" style={{ background: 'rgba(26, 31, 46, 0.8)', backdropFilter: 'blur(10px)', borderTop: '4px solid #ffd700' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-black" style={{ background: '#ffd700', fontWeight: 900 }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl text-white mb-1" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>{user?.name}</h2>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              {user?.role === 'admin' && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-[#ffd700] text-black font-semibold">{t('Admin')}</span>
              )}
            </div>
          </div>
          {user?.favoriteTeam && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: 'rgba(255, 215, 0, 0.1)' }}>
              <Heart className="w-5 h-5 text-[#ffd700]" fill="#ffd700" />
              <div><p className="text-xs text-gray-400">{t('Favorite Team')}</p><p className="text-white font-semibold">{user.favoriteTeam}</p></div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-3">
        <button onClick={() => navigate('/profile/favorite-players')} className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <Star className="w-5 h-5 text-gray-400" />
          <div><p className="text-white font-semibold">{t('Favorite Players')}</p><p className="text-xs text-gray-400">{t('Browse and revisit your player shortlist')}</p></div>
        </button>
        
        <button onClick={() => navigate('/profile/notifications')} className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <Bell className="w-5 h-5 text-gray-400" />
          <div><p className="text-white font-semibold">{t('Notifications')}</p><p className="text-xs text-gray-400">{t('Open update shortcuts and notification hub')}</p></div>
        </button>

        {/* Admin Panel Button - Only visible to admins */}
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors"
            style={{ background: 'rgba(26, 31, 46, 0.8)' }}
          >
            <Newspaper className="w-5 h-5 text-[#ffd700]" />
            <div className="flex-1">
              <p className="text-white font-semibold">{t('Admin Panel')}</p>
              <p className="text-xs text-gray-400">{t('Manage news articles')}</p>
            </div>
          </button>
        )}

        <button onClick={() => navigate('/profile/privacy-security')} className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <Shield className="w-5 h-5 text-gray-400" />
          <div><p className="text-white font-semibold">{t('Privacy & Security')}</p><p className="text-xs text-gray-400">{t('Open available account protection actions')}</p></div>
        </button>

        <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-red-500/10" style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
          <LogOut className="w-5 h-5 text-red-500" />
          <div><p className="text-red-500 font-semibold">{t('Sign Out')}</p><p className="text-xs text-gray-400">{t('Log out from your account')}</p></div>
        </button>
      </div>
    </div>
  );
}

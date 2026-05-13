// src/app/components/MobileMenu.tsx
import { useNavigate } from 'react-router';
import { X, Home, Calendar, Trophy, Users, BarChart3, Newspaper, User, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const menuItems = [
    { icon: Home, label: t('Home'), path: '/' },
    { icon: Calendar, label: t('Matches'), path: '/matches' },
    { icon: Trophy, label: t('Standings'), path: '/discover?section=table' },
    { icon: BarChart3, label: t('Stats Hub'), path: '/stats' },
    { icon: Users, label: t('Teams'), path: '/teams' },
    { icon: Newspaper, label: t('News'), path: '/news' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed right-0 top-0 h-full w-80 z-50 shadow-xl animate-slide-in" style={{ background: 'rgba(10, 14, 26, 0.98)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-1 h-8 bg-[#009639]" />
              <div className="w-1 h-8 bg-[#ffd700]" />
              <div className="w-1 h-8 bg-[#da121a]" />
            </div>
            <h1 className="text-xl font-black text-white">EPL</h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#ffd700] flex items-center justify-center">
                <span className="text-black font-bold text-lg">{user.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
                {user.favoriteTeam && (
                  <p className="text-xs text-[#ffd700]">❤️ {user.favoriteTeam}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="text-white">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-2" />

        {/* Additional Options */}
        <div className="py-2">
          <button
            onClick={() => handleNavigation('/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-white">{t('My Profile')}</span>
          </button>
          <button
            onClick={() => handleNavigation('/profile/notifications')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="text-white">{t('Notifications')}</span>
          </button>
          <button
            onClick={() => handleNavigation('/profile/privacy-security')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-white">{t('Settings')}</span>
          </button>
        </div>

        {/* Logout Button */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-red-500 font-semibold hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('Sign Out')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

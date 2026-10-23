import { useNavigate } from 'react-router';
import { X, Home, Calendar, Trophy, Users, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BrandLockup } from './BrandLockup';

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
    { icon: Trophy, label: t('Groups'), path: '/groups' },
    { icon: Calendar, label: t('Matches'), path: '/matches' },
    { icon: Users, label: t('Departments'), path: '/teams' },
    { icon: User, label: t('Profile'), path: '/profile' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-80 animate-slide-in bg-[#0c1424] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <BrandLockup size="sm" />
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close menu">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {user && (
          <div className="border-b border-white/10 p-4">
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-xs text-white/50">{user.email}</p>
          </div>
        )}

        <div className="py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigation(item.path)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
              >
                <Icon className="h-5 w-5 text-white/50" />
                <span className="text-white">{item.label}</span>
              </button>
            );
          })}
        </div>

        {user && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              {t('Sign Out')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// src/app/components/BottomNav.tsx
import { Home, Calendar, Newspaper, Compass, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useLanguage } from '../context/LanguageContext';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', label: t('Home'), icon: Home, path: '/' },
    { id: 'matches', label: t('Matches'), icon: Calendar, path: '/matches' },
    { id: 'discover', label: t('Discover'), icon: Compass, path: '/discover' },
    { id: 'news', label: t('News'), icon: Newspaper, path: '/news' },
    { id: 'profile', label: t('Profile'), icon: User, path: '/profile' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-lg"
      style={{
        background: 'rgba(10, 14, 26, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="flex justify-around items-center max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center py-3 px-4 transition-colors flex-1"
            >
              <Icon 
                className={`w-5 h-5 mb-1 ${
                  isActive ? 'text-[#ffd700]' : 'text-gray-400'
                }`}
                fill={isActive ? '#ffd700' : 'none'}
              />
              <span 
                className={`text-xs ${
                  isActive ? 'text-[#ffd700] font-semibold' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

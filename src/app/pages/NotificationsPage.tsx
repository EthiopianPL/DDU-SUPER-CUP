import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, Newspaper, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const shortcuts = [
    {
      title: t('Latest League News'),
      description: t('Stay on top of transfer updates, previews, and breaking stories.'),
      path: '/news',
      icon: Newspaper,
    },
    {
      title: t('Upcoming Matches'),
      description: t('Jump back into the fixture list and check what is next.'),
      path: '/matches',
      icon: Calendar,
    },
  ];

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
          <Bell className="w-8 h-8 text-[#ffd700]" />
          {t('Notifications')}
        </h1>
        <p className="text-gray-400">{t('Review updates and quick links without losing your place.')}</p>
      </div>

      <div className="px-4 space-y-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors"
              style={{ background: 'rgba(26, 31, 46, 0.8)' }}
            >
              <Icon className="w-5 h-5 text-[#ffd700]" />
              <div>
                <p className="text-white font-semibold">{item.title}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

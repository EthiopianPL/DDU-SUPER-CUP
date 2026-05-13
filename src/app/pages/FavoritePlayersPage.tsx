import { useNavigate } from 'react-router';
import { ArrowLeft, Star, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function FavoritePlayersPage() {
  const navigate = useNavigate();
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
          <Star className="w-8 h-8 text-[#ffd700]" />
          {t('Favorite Players')}
        </h1>
        <p className="text-gray-400">{t('Track the players you care about most.')}</p>
      </div>

      <div className="px-4">
        <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl text-white font-semibold mb-2">{t('Build your shortlist')}</h2>
          <p className="text-gray-400 mb-6">
            {t('Favorite-player management is being prepared. You can explore player profiles now and come back here as this area grows.')}
          </p>
          <button
            onClick={() => navigate('/players')}
            className="w-full py-3 rounded-lg text-black font-semibold"
            style={{ background: '#ffd700' }}
          >
            {t('Browse Players')}
          </button>
        </div>
      </div>
    </div>
  );
}

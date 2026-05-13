import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface NewsCardProps {
  id: string;
  title: string;
  category: string;
  time: string;
  image: string;
  teamColor?: string;
}

export function NewsCard({ title, category, time, image, teamColor }: NewsCardProps) {
  const [imgError, setImgError] = useState(false);
  const { t } = useLanguage();
  
  return (
    <div className="rounded-lg overflow-hidden transition-all hover:scale-[1.02]" style={{ 
      background: 'rgba(26, 31, 46, 0.8)',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="flex gap-3">
        <div className="w-24 h-24 flex-shrink-0">
          {!imgError ? (
            <img 
              src={image} 
              alt={title} 
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <span className="text-2xl">📰</span>
            </div>
          )}
        </div>
        <div className="flex-1 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: teamColor || '#ffd700', color: '#000' }}>
              {t(category)}
            </span>
            <span className="text-xs text-gray-400">{time}</span>
          </div>
          <h3 className="text-white font-semibold text-sm line-clamp-2">{title}</h3>
        </div>
      </div>
    </div>
  );
}

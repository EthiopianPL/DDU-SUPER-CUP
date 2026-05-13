import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Newspaper } from 'lucide-react';
import { NewsCard } from '../components/NewsCard';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { formatRelativeTime } from '../i18n';

interface NewsItem {
  id: string;
  title: string;
  category: string;
  time: string;
  image: string;
  teamColor: string;
}

export function NewsPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, [language]);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });

      if (error) throw error;

      setNews(
        (data || []).map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          time: formatRelativeTime(item.created_at, t, language),
          image: item.image || 'https://images.unsplash.com/photo-1698844013403-b7c4cf0d3b2f',
          teamColor: item.team_color || '#ffd700',
        })),
      );
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
          <Newspaper className="w-8 h-8 text-[#ffd700]" />
          {t('Latest News')}
        </h1>
        <p className="text-gray-400">{t('Stay updated with EPL')}</p>
      </div>
      <div className="px-4 space-y-4">
        {news.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/news/${item.id}`)}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <NewsCard {...item} />
          </div>
        ))}
        {news.length === 0 && (
          <div className="text-center py-12 rounded-lg" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <Newspaper className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t('No news available')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

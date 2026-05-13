// src/app/pages/NewsDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, User, Share2, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  image: string;
  team_color: string;
  author: string;
  created_at: string;
}

export function NewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    fetchNews();
  }, [id]);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setNews(data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

const getTimeAgo = (dateString: string) => {
  // Parse the date as UTC (append 'Z' if missing)
  let utcDate: Date;
  if (dateString.includes('Z') || dateString.includes('+')) {
    utcDate = new Date(dateString);
  } else {
    // Assume it's UTC without suffix
    utcDate = new Date(dateString + 'Z');
  }

  const now = new Date();
  const diffMs = now.getTime() - utcDate.getTime(); // now is local, but utcDate is UTC – subtract correctly

  const diffSec = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return utcDate.toLocaleDateString();
};

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: news?.title,
        text: news?.content.substring(0, 100),
        url: window.location.href,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">News not found</p>
          <button onClick={() => navigate('/news')} className="px-4 py-2 bg-[#ffd700] text-black rounded-lg font-semibold">
            Back to News
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-black/50 border-b border-white/10">
        <div className="px-4 py-3">
          <button onClick={() => navigate('/news')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to News</span>
          </button>
        </div>
      </div>

      {/* Simple Image Layout - No wrapping */}
      <div className="w-full">
        {news.image && !imgError ? (
          <div className="w-full">
            <img
              src={news.image}
              alt={news.title}
              className="w-full max-h-[500px] object-contain bg-[#0a0e1a]"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-[#1a1f2e] to-[#0a0e1a] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-3">📰</div>
              <p className="text-gray-500">No image available</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-6">
        {/* Category Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: news.team_color || '#ffd700', color: '#000' }}>
            {news.category}
          </span>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#ffd700] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          {news.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-400 border-b border-white/10 pb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{getTimeAgo(news.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>By {news.author || 'EPL Admin'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {news.content}
          </p>
        </div>

        {/* Back to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-8 w-full py-3 rounded-lg text-center text-sm text-gray-400 hover:text-[#ffd700] transition-colors border border-white/10"
        >
          ↑ Back to Top
        </button>
      </div>
    </div>
  );
}
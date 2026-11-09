import { useNavigate } from 'react-router';
import { newsArticles } from '../../data/news';
import { useLeagueVersion } from '../../data/live';
import { stripHtml } from '../utils/richText';
import { NewsImageSlider, getArticleImages } from '../components/NewsImageSlider';

export function NewsPage() {
  const version = useLeagueVersion();
  void version;
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-3 sm:pt-5">
      <div className="space-y-4">
        {newsArticles.map((article) => {
          const images = getArticleImages(article);
          return (
            <div
              key={article.id}
              className="group w-full overflow-hidden rounded-2xl border border-white/10 bg-[#10192b] text-left transition-colors hover:border-white/20"
            >
              {images.length > 0 && (
                <NewsImageSlider
                  images={images}
                  alt={stripHtml(article.title)}
                  className="h-56 sm:h-64 w-full"
                  onImageClick={() => navigate(`/news/${article.id}`)}
                />
              )}
              <div
                className="cursor-pointer p-4 sm:p-5"
                onClick={() => navigate(`/news/${article.id}`)}
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-[#f5c518] px-2 py-0.5 text-[#102018]">{article.category}</span>
                  <span className="text-white/40">{article.time}</span>
                </div>
                <h2 className="mt-2 text-lg font-black text-white group-hover:text-[#f5c518] transition-colors">{stripHtml(article.title)}</h2>
                <p className="mt-1 text-sm text-white/60">{stripHtml(article.summary)}</p>
              </div>
            </div>
          );
        })}
        {!newsArticles.length && (
          <p className="rounded-2xl border border-white/10 bg-[#10192b] px-4 py-8 text-center text-sm text-white/50">
            No stories published yet.
          </p>
        )}
      </div>
    </div>
  );
}

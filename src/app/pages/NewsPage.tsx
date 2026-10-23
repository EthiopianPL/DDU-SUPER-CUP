import { useNavigate } from 'react-router';
import { newsArticles } from '../../data/news';

export function NewsPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <h1 className="text-3xl font-black text-white">News</h1>
      <p className="mt-1 text-sm text-white/50">Dire Dawa University Super Cup</p>

      <div className="mt-5 space-y-3">
        {newsArticles.map((article) => (
          <button
            key={article.id}
            type="button"
            onClick={() => navigate(`/news/${article.id}`)}
            className="w-full rounded-2xl border border-white/10 bg-[#10192b] p-4 text-left hover:bg-white/5"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-[#f5c518] px-2 py-0.5 text-[#102018]">{article.category}</span>
              <span className="text-white/40">{article.time}</span>
            </div>
            <h2 className="mt-2 text-lg font-black text-white">{article.title}</h2>
            <p className="mt-1 text-sm text-white/60">{article.summary}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

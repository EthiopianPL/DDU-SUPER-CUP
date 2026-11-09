import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { getNewsArticle } from '../../data/news';
import { useLeagueVersion } from '../../data/live';
import { RichTextContent } from '../components/RichTextContent';
import { NewsImageSlider, getArticleImages } from '../components/NewsImageSlider';

export function NewsDetailPage() {
  const version = useLeagueVersion();
  void version;
  const { id } = useParams();
  const navigate = useNavigate();
  const article = id ? getNewsArticle(id) : undefined;

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-white/60">Story not found.</p>
        <button type="button" onClick={() => navigate('/news')} className="mt-4 text-[#f5c518]">Back to news</button>
      </div>
    );
  }

  const images = getArticleImages(article);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <button type="button" onClick={() => navigate('/news')} className="mb-4 flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        News
      </button>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">{article.category} · {article.time}</p>
      <h1 className="mt-2 text-3xl font-black text-white">{article.title}</h1>
      {images.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-3xl">
          <NewsImageSlider
            images={images}
            alt={article.title}
            className="h-72 sm:h-96 w-full"
          />
        </div>
      )}
      <div className="mt-6">
        <RichTextContent content={article.body} />
      </div>
    </div>
  );
}

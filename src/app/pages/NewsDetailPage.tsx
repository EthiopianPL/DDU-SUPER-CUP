import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { getNewsArticle } from '../../data/news';
import { useLeagueVersion } from '../../data/live';
import { RichTextContent } from '../components/RichTextContent';

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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <button type="button" onClick={() => navigate('/news')} className="mb-4 flex items-center gap-2 text-sm text-white/60">
        <ArrowLeft className="h-4 w-4" />
        News
      </button>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">{article.category} · {article.time}</p>
      <h1 className="mt-2 text-3xl font-black text-white">{article.title}</h1>
      {article.imageUrl && <img src={article.imageUrl} alt="" className="mt-5 h-72 w-full rounded-3xl object-cover" />}
      <div className="mt-6">
        <RichTextContent content={article.body} />
      </div>
    </div>
  );
}

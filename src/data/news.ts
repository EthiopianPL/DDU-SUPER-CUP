export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  time: string;
  summary: string;
  body: string;
}

export const newsArticles: NewsArticle[] = [];

export function getNewsArticle(id: string) {
  return newsArticles.find((article) => article.id === id);
}

export type ArticleCategory = 'news' | 'update' | 'tutorial' | 'maintenance';

export interface Article {
  id: string;
  title: string;
  titleEn?: string;
  summary: string;
  summaryEn?: string;
  content: string;
  contentEn?: string;
  category: ArticleCategory;
  author: string;
  publishedAt: number;
  readTimeMinutes: number;
  pinned?: boolean;
  tags?: string[];
}

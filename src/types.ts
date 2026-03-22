export interface WPPost {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  categories: number[];
  tags: number[];
  jetpack_featured_media_url: string;
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ScrapedPost {
  id: number;
  date: string;
  slug: string;
  originalUrl: string;
  title: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  categories: string[];
}

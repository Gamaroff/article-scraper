import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import type { WPPost, WPCategory, ScrapedPost } from './types';

const SITE = 'onedaringjew.wordpress.com';
const BASE_URL = `https://public-api.wordpress.com/wp/v2/sites/${SITE}`;
const OUTPUT_DIR = path.join(process.cwd(), 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'posts.json');
const PER_PAGE = 100;

async function fetchCategories(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  let page = 1;

  while (true) {
    const res = await axios.get<WPCategory[]>(`${BASE_URL}/categories`, {
      params: { per_page: 100, page },
    });
    for (const cat of res.data) {
      map.set(cat.id, cat.name);
    }
    const total = parseInt(res.headers['x-wp-totalpages'] ?? '1', 10);
    if (page >= total) break;
    page++;
  }

  return map;
}

async function fetchAllPosts(): Promise<WPPost[]> {
  const posts: WPPost[] = [];
  let page = 1;

  const firstRes = await axios.get<WPPost[]>(`${BASE_URL}/posts`, {
    params: { per_page: PER_PAGE, page: 1, _fields: 'id,date,slug,link,title,content,excerpt,categories,tags,jetpack_featured_media_url' },
  });

  const totalPages = parseInt(firstRes.headers['x-wp-totalpages'] ?? '1', 10);
  const totalPosts = parseInt(firstRes.headers['x-wp-total'] ?? '0', 10);
  console.log(`Found ${totalPosts} posts across ${totalPages} pages`);

  posts.push(...firstRes.data);
  console.log(`Fetched page 1/${totalPages}`);

  for (page = 2; page <= totalPages; page++) {
    const res = await axios.get<WPPost[]>(`${BASE_URL}/posts`, {
      params: { per_page: PER_PAGE, page, _fields: 'id,date,slug,link,title,content,excerpt,categories,tags,jetpack_featured_media_url' },
    });
    posts.push(...res.data);
    console.log(`Fetched page ${page}/${totalPages}`);
  }

  return posts;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Fetching categories...');
  const categoryMap = await fetchCategories();
  console.log(`Loaded ${categoryMap.size} categories`);

  console.log('Fetching posts...');
  const rawPosts = await fetchAllPosts();

  const posts: ScrapedPost[] = rawPosts.map((p) => ({
    id: p.id,
    date: p.date,
    slug: p.slug,
    originalUrl: p.link,
    title: decodeHtmlEntities(p.title.rendered),
    content: p.content.rendered,
    excerpt: decodeHtmlEntities(p.excerpt.rendered.replace(/<[^>]+>/g, '').trim()),
    featuredImage: p.jetpack_featured_media_url || '',
    categories: p.categories.map((id) => categoryMap.get(id) ?? String(id)),
  }));

  // Sort oldest first
  posts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2));
  console.log(`\nSaved ${posts.length} posts to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

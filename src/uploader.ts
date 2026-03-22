import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import type { ScrapedPost } from './types';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
const PROGRESS_FILE = path.join(process.cwd(), 'data', 'upload-progress.json');

// Delay between posts to avoid rate limiting (ms)
const DELAY_MS = 2000;

interface Progress {
  uploaded: number[];   // post IDs successfully uploaded
  failed: number[];     // post IDs that failed
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { uploaded: [], failed: [] };
}

function saveProgress(progress: Progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginToSubstack(email: string, password: string): Promise<AxiosInstance> {
  const client = axios.create({
    baseURL: 'https://substack.com',
    withCredentials: true,
  });

  // Login to get session cookie
  const loginRes = await client.post('/api/v1/login', {
    email,
    password,
    captcha_token: '',
  });

  const setCookieHeader = loginRes.headers['set-cookie'];
  if (!setCookieHeader) {
    throw new Error('Login failed: no session cookie returned');
  }

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const cookieString = cookies.map((c) => c.split(';')[0]).join('; ');

  console.log('Logged in to Substack successfully');

  // Return an axios instance with the session cookie baked in
  return axios.create({
    headers: { Cookie: cookieString },
    withCredentials: true,
  });
}

async function createDraft(
  client: AxiosInstance,
  publication: string,
  post: ScrapedPost
): Promise<number> {
  const res = await client.post(`https://${publication}.substack.com/api/v1/drafts`, {
    draft_title: post.title,
    draft_body: post.content,
    draft_subtitle: post.excerpt.slice(0, 300),
    section_chosen: false,
    type: 'newsletter',
  });
  return res.data.id as number;
}

async function main() {
  const email = process.env.SUBSTACK_EMAIL;
  const password = process.env.SUBSTACK_PASSWORD;
  const publication = process.env.SUBSTACK_PUBLICATION;

  if (!email || !password || !publication) {
    console.error('Missing env vars. Set SUBSTACK_EMAIL, SUBSTACK_PASSWORD, SUBSTACK_PUBLICATION in .env');
    process.exit(1);
  }

  if (!fs.existsSync(POSTS_FILE)) {
    console.error('No posts.json found. Run the scraper first: npm run scrape');
    process.exit(1);
  }

  const posts: ScrapedPost[] = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
  const progress = loadProgress();
  const uploadedSet = new Set(progress.uploaded);

  const pending = posts.filter((p) => !uploadedSet.has(p.id));
  console.log(`${posts.length} total posts | ${progress.uploaded.length} already uploaded | ${pending.length} pending`);

  if (pending.length === 0) {
    console.log('All posts already uploaded!');
    return;
  }

  const client = await loginToSubstack(email, password);

  let count = 0;
  for (const post of pending) {
    try {
      const draftId = await createDraft(client, publication, post);
      progress.uploaded.push(post.id);
      saveProgress(progress);
      count++;
      console.log(`[${count}/${pending.length}] Drafted: "${post.title}" (draft id: ${draftId})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to upload "${post.title}": ${msg}`);
      progress.failed.push(post.id);
      saveProgress(progress);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${count} posts uploaded as drafts.`);
  console.log(`Log into Substack and publish them from your drafts panel.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

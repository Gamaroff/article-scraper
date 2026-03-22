# article-scraper

Scrapes all posts from a WordPress.com blog and uploads them to Substack as drafts.

Built for migrating [onedaringjew.wordpress.com](https://onedaringjew.wordpress.com) (863 posts, 2009–present).

## How it works

1. **Scraper** — calls the WordPress.com REST API to fetch every published post, resolves category names, and saves the results to `data/posts.json`.
2. **Uploader** — reads `data/posts.json`, logs into Substack, and creates each post as a draft via Substack's internal API. Progress is tracked in `data/upload-progress.json` so interrupted runs resume safely.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```
SUBSTACK_EMAIL=you@example.com
SUBSTACK_PASSWORD=yourpassword
SUBSTACK_PUBLICATION=yourpublication   # subdomain only, e.g. "mypub" for mypub.substack.com
```

## Usage

### Step 1 — Scrape

```bash
npm run scrape
```

Fetches all posts from the WordPress.com API and writes them to `data/posts.json`. Takes 1–2 minutes for ~900 posts.

### Step 2 — Upload

```bash
npm run upload
```

Uploads each post to Substack as a draft. Runs at ~2 seconds per post to avoid rate limiting (~30 minutes for 863 posts). After uploading, publish drafts from your Substack dashboard.

## Output files

| File | Description |
|---|---|
| `data/posts.json` | All scraped posts |
| `data/upload-progress.json` | Tracks which post IDs have been uploaded |

## Post structure

Each entry in `posts.json`:

```json
{
  "id": 1,
  "date": "2009-08-15T18:49:14",
  "slug": "my-post-slug",
  "originalUrl": "https://yourblog.wordpress.com/2009/08/15/my-post-slug/",
  "title": "Post Title",
  "content": "<p>HTML content...</p>",
  "excerpt": "Plain text excerpt...",
  "featuredImage": "https://...",
  "categories": ["Autobiography"]
}
```

## Adapting for a different blog

To point this at a different WordPress.com blog, change the `SITE` constant at the top of `src/scraper.ts`.

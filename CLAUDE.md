# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run scrape    # fetch all posts from WordPress.com → data/posts.json
npm run upload    # upload posts to Substack as drafts
npx tsc --noEmit  # type-check without compiling
```

Scripts are run directly with `tsx` (no build step required).

## Architecture

Two independent scripts connected by a JSON file:

```
src/scraper.ts  →  data/posts.json  →  src/uploader.ts
```

**`src/scraper.ts`** — Hits the WordPress.com REST API (`public-api.wordpress.com/wp/v2/sites/<SITE>/posts`) in pages of 100. Resolves category IDs to names via a separate categories fetch. Outputs `data/posts.json` sorted oldest-first.

**`src/uploader.ts`** — Reads `data/posts.json`, authenticates to Substack via `POST /api/v1/login` (cookie-based session), then creates each post as a draft via `POST https://<publication>.substack.com/api/v1/drafts`. Persists progress to `data/upload-progress.json` after each post so reruns skip already-uploaded IDs.

**`src/types.ts`** — Shared types: `WPPost` (raw API shape), `WPCategory`, `ScrapedPost` (normalised shape written to JSON).

## Environment

Requires a `.env` file (see `.env.example`):
- `SUBSTACK_EMAIL` / `SUBSTACK_PASSWORD` — Substack login credentials
- `SUBSTACK_PUBLICATION` — subdomain only (e.g. `mypub` for `mypub.substack.com`)

`data/` and `.env` are gitignored.

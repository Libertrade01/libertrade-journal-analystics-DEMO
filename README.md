# Libertrade Analytics Demo

Static demo of the Libertrade Analytics dashboard. Uses in-memory mock trade data (no Supabase, no env vars).

## Features

- Full analytics UI adapted from Trade Desk `public/analytics.html`
- Mock trades with dates relative to today (This week / Last week / This month filters work)
- **Sign in to Demo** — no Google auth; sample data only
- Read-only: import, sync, and commission backfill are disabled
- Default UI scale matches **125% browser zoom** via `html { zoom: 1.25; }` (the layout is mostly `px`-based; root `font-size` alone would not scale charts and spacing the same way). Works in Chromium/Edge; Safari 15.4+ supports CSS `zoom`.

## Local development

```bash
cd "c:\Users\44758\Desktop\Libertrade Code\libertrade-analytics-demo"
npm run build
npm run dev
```

Open http://localhost:3456

`npm run build` regenerates `public/index.html` from the Trade Desk source.

## Deploy to Vercel

1. Push this folder to GitHub (or import the directory in Vercel).
2. Create a new Vercel project named **libertrade-analytics-demo** (or your choice).
3. Framework preset: **Other**
4. Build command: `npm run build`
5. Output directory: `public`
6. No environment variables required.

Or with Vercel CLI from this directory:

```bash
npm i -g vercel
vercel
```

## Portfolio case study

Michael Low portfolio case-study copy can link to the deployed demo URL once live. No case-study file changes are required in this repo.

## Project layout

```
libertrade-analytics-demo/
  package.json
  vercel.json
  README.md
  scripts/build-demo-html.js
  public/
    index.html          # generated — do not hand-edit; run npm run build
    favicon.svg
    js/
      mock-store.js     # in-memory API + mock data
      demo-bootstrap.js # fetch interceptor, auto-login, read-only UI
```

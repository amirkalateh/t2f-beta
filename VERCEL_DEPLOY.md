# Tex2Film - Vercel Deployment Guide

## Prerequisites

- GitHub repo with `etudezip/` as the Next.js app directory
- Vercel account (free tier works)
- PostgreSQL database (Vercel Postgres, Supabase, or Neon)

---

## 1. Push to GitHub

```bash
# From repo root
rm -rf .next attached_assets
rm -f .gitignore
# Create fresh .gitignore (already done)
cd etudezip && git add . && git commit -m "Deploy ready: fix config, Suspense, db.ts"
# Then push to GitHub
```

## 2. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repo
4. **Important**: Set **Root Directory** to `etudezip`
5. Framework Preset: Next.js (auto-detected)
6. Click Deploy

## 3. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | Your PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | 32+ random chars | `your-secret-key-here-32-chars-min` |
| `OPENROUTER_API_KEY` | Your OpenRouter key | `sk-or-v1-...` |
| `ELEVENLABS_API_KEY` | Your ElevenLabs key | `sk_...` |
| `KLING_SECRET_KEY` | Your Kling AI key | `...` |
| `KLING_IMAGE_SECRET_KEY` | Your Kling image key | `...` |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | Vercel Blob token | `vercel_blob_rw_...` |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL | `https://tex2film.vercel.app` |

## 4. Database Setup

Option A: Vercel Postgres (recommended)
- Go to Vercel Dashboard → Storage → Create Postgres Database
- Copy the connection string to `DATABASE_URL`

Option B: Supabase / Neon
- Create a PostgreSQL project
- Copy connection string with password

## 5. Run Migrations

After first deploy, run the schema push:
```bash
# Locally (or use Vercel CLI)
vercel env pull .env.local
cd etudezip
npx drizzle-kit push
```

Or use the setup API:
```bash
curl https://tex2film.vercel.app/api/setup
```

## 6. Verify Deployment

- Landing page: `/`
- Login: `/login`
- Signup: `/signup`
- Projects (auth required): `/projects`
- Docs: `/docs`
- About: `/about`
- Contact: `/contact`
- Terms: `/terms`
- Privacy: `/privacy`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "DATABASE_URL must be set" | Add env var in Vercel dashboard |
| "Build failed" | Check `etudezip/` is set as root directory |
| "cannot find module @shared" | Verify `@shared` alias points to `etudezip/shared` |
| Prerender errors | Check for `useSearchParams` without `Suspense` |

## Key Changes Made for Deployment

1. `next.config.cjs` - Fixed `@shared` alias, removed `allowedDevOrigins` (dev-only)
2. `lib/db.ts` - Lazy initialization (won't throw during build without DATABASE_URL)
3. `.gitignore` - Added proper Next.js gitignore
4. `pnpm-lock.yaml` - Generated for reproducible builds
5. `app/login/page.tsx` + `app/sound/page.tsx` - Wrapped `useSearchParams` in `Suspense`
6. `vercel.json` - Build configuration

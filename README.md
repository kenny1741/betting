# ⚽ Football IQ — v5

Professional football prediction dashboard with Supabase backend, background sync engine, and caching layer.

## Architecture

```
API-Football → /api/sync → Supabase DB → /api/matches → Frontend
                ↑                             ↑
           (background)              (in-memory cache)
```

**Frontend NEVER calls API-Football directly.**
All reads come from Supabase. Syncs happen on demand or via cron.

## Quick Start

### 1. Install
```bash
cd fiq
npm install
```

### 2. Create Supabase project
1. Go to https://supabase.com → New Project
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
3. Go to **Settings → API** → copy URL, anon key, service role key

### 3. Get RapidAPI key
1. Go to https://rapidapi.com/api-sports/api/api-football
2. Subscribe to **Basic** (free, 100 req/day)
3. Copy your key

### 4. Configure environment
```bash
cp .env.example .env.local
# Fill in all 5 values
```

### 5. Run
```bash
npm run dev
```

### 6. Sync data (REQUIRED to see matches)
Open http://localhost:3000/admin
- Enter your `SYNC_SECRET` from `.env.local`
- Click **"Full Sync"**
- Wait ~30 seconds (fetches fixtures + standings for all 3 leagues)
- Go back to http://localhost:3000 — matches appear!

## API Usage

Each full sync uses approximately:
- 3 requests for fixtures (1 per league)
- 3 requests for standings (1 per league)  
- 6 requests total for live updates (fixtures + events per league)

With 100 free requests/day this is very sustainable.

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Predictions, live scores, top picks |
| Admin | `/admin` | Trigger syncs manually |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/matches?tab=today` | GET | Today's matches from Supabase |
| `/api/matches?tab=tomorrow` | GET | Tomorrow's matches |
| `/api/matches?tab=upcoming` | GET | Next 7 days |
| `/api/live` | GET | Live matches (30s cache) |
| `/api/picks` | GET | Top 3 picks (80%+ confidence) |
| `/api/sync?secret=X&type=full` | GET | Trigger full sync |

## Prediction Engine

5-factor weighted model:

| Factor | Weight |
|--------|--------|
| Recent form (last 5 games) | 28% |
| League position gap | 22% |
| Goal threat analysis | 25% |
| Points per game | 15% |
| Home advantage | 10% |

Pick selection priority:
1. Home/Draw/Away (if ≥65% confidence)
2. BTTS Yes (if ≥65%)
3. Over 2.5 Goals (if ≥65%)
4. Over 1.5 Goals (last resort only)

Top Picks = confidence ≥ 80%

## Deploy to Vercel

```bash
npx vercel --prod
```

Add all env vars in Vercel Dashboard → Settings → Environment Variables.

Add to `vercel.json` for automated syncs:
```json
{
  "crons": [
    { "path": "/api/sync?secret=YOUR_SECRET&type=full", "schedule": "0 6 * * *" },
    { "path": "/api/sync?secret=YOUR_SECRET&type=live", "schedule": "*/2 * * * *" }
  ]
}
```

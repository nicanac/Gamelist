# Game Library

A motion-heavy showcase of the game library kept in Notion (the **Game List** database under
*My Game Library*). Built with Next.js 16, GSAP (ScrollTrigger, Flip, SplitText), Lenis and Tailwind CSS 4.

- **Intro and hero**: a count-up curtain, then kinetic type ("Played. Playing. Up next.") over an endless,
  3D-tilted wall of covers that drifts, follows the pointer and flattens as you scroll.
- **Now playing**: every *In progress* game on a pinned, horizontally scrolling track with parallax covers.
- **By the numbers**: status, platforms, genres, franchises and release years, computed from the database,
  with tooltips and a table view for every chart.
- **The collection**: all games in a filterable grid (search, status, platform, genre, sort). Filtering
  animates with GSAP Flip; cards tilt toward the pointer.
- **Game view**: the cover flies from its card into a detail view (scores, HowLongToBeat, difficulty, play
  modes, notes). `?game=<slug>` deep links, Back closes, ←/→ browse, Esc exits.
- **Accessible motion**: `prefers-reduced-motion` turns off the intro, smooth scrolling, tilt and reveals;
  dialogs trap and restore focus.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

It works right away from `src/data/library.json`, a snapshot of the Notion database (237 games). Connect
Notion to read it live.

## Read Notion live

1. Create an internal integration at <https://www.notion.so/profile/integrations> and copy its token.
2. In Notion, open the **Game List** database, then **⋯ → Connections → Connect to** your integration.
3. `cp .env.example .env.local` and set `NOTION_TOKEN`. The data source id is already filled in.

The page reads Notion through a `"use cache"` function (`src/lib/library.ts`) tagged `library` and
revalidated hourly. If Notion is unreachable or misconfigured, the app logs the error and serves the snapshot.

| Notion property | Shown as |
| --- | --- |
| `name`, `platforms`, `status` | title, platform, status (all six statuses) |
| `mc_score`, `user_rating` | Metacritic ring, personal rating (18 → 18/20, 90 → 90/100) |
| `genres`, `franchises`, `labels`, `developers`, `publishers` | tags, search, charts |
| `release_date`, `hltb_main_story` (`"5,50"` → 5.5 h), `difficulty` | facts in the game view, sorting |
| `description`, `description_short`, `notes`, `dlc` | game view text |
| `single_player`, `local_*`, `online_*`, `lan_*`, `player_info_*_max` | play modes |

## Cover art

The database has no cover property, so covers are resolved in this order:

1. The page cover in Notion, or a `cover` URL/files property if you add one. **Set a page cover to override any game.**
2. A cover baked into the snapshot by `npm run sync`, which also picks up an image placed at the top of a
   game's page (like Dead Cells).
3. `GET /api/cover/[id]`: IGDB when `IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET` are set, then Wikipedia's infobox
   art. Results are cached (Next fetch cache and `s-maxage`), so each game is looked up rarely.
4. Generated poster art, so nothing ever looks broken.

## Keeping it fresh

- **Automatically**: the cached library revalidates every hour.
- **Snapshot**: `npm run sync` (needs `NOTION_TOKEN`) rewrites `src/data/library.json` and bakes in covers.
  Add `-- --refresh-covers` to look covers up again, or `-- --no-covers` to skip them.
- **On demand**: `POST /api/revalidate` refreshes immediately when it carries either
  `Authorization: Bearer $REVALIDATE_SECRET` (for a Notion database automation's *Send webhook* action,
  a cron job or curl), or a signed Notion integration webhook. For the latter, point the webhook at
  `/api/revalidate`; the one-time verification token is printed to the server log. Paste it into Notion
  and save it as `NOTION_WEBHOOK_VERIFICATION_TOKEN`.

```bash
curl -X POST -H "Authorization: Bearer $REVALIDATE_SECRET" https://your-site/api/revalidate
```

## Deploy

On Vercel: import the repository and add the environment variables from `.env.example`. `SITE_URL` is only
needed on other hosts, so social previews get absolute URLs.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run lint` | ESLint (Next.js core web vitals + React Compiler rules) |
| `npm run typecheck` | Route type generation + `tsc` |
| `npm test` | Vitest: normalization, filters, stats, cover matching, Notion paging, snapshot integrity |
| `npm run sync` | Refresh the snapshot from Notion |

## Project layout

```
src/app/                 page, layout, OG image, API routes (cover lookup, revalidate)
src/components/          hero + cover wall, now playing, stats + charts, collection, game modal, chrome
src/lib/                 Notion client + normalizer, library loader, covers, stats, filters, GSAP setup
src/data/library.json    snapshot used when Notion is not configured
scripts/sync-notion.ts   snapshot + cover baking
presentation/            a 36-second film of the app, made with HyperFrames (see its README)
```

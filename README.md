# Game Library

A motion-heavy showcase of the game library kept in my Brain (`cortex/catalog` `games` +
`imported/game-list`). Built with Next.js 16, GSAP (ScrollTrigger, Flip, SplitText), Lenis and
Tailwind CSS 4.

- **Intro and hero**: a count-up curtain, then kinetic type ("Played. Playing. Up next.") over an endless,
  3D-tilted wall of covers that drifts, follows the pointer and flattens as you scroll.
- **Now playing**: every *In progress* game on a pinned, horizontally scrolling track with parallax covers.
- **By the numbers**: status, platforms, genres, franchises and release years, computed from the Brain,
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

It works right away from `src/data/library.json`, a snapshot of the Brain catalog (238 games). Connect
Brain API to read and sync live.

## Read Brain live

1. Mint an API token at <https://brain.nicode.eu/settings/tokens> with `records:read` and `records:write`.
2. `cp .env.example .env.local` and set `BRAIN_TOKEN`.

The page reads the `games` catalog (`cortex/catalog`) joined with `imported/game-list` through a
`"use cache"` function (`src/lib/library.ts`) tagged `library` and revalidated every few minutes. If the
Brain API is unreachable or unconfigured, the app logs the error and serves the snapshot.

| Brain property | Shown as |
| --- | --- |
| `name`, `platforms`, `status` | title, platform, status (all six statuses) |
| `mc_score`, `user_rating` | Metacritic ring, personal rating (18 → 18/20, 90 → 90/100) |
| `genres`, `franchises`, `labels`, `developers`, `publishers` | tags, search, charts |
| `release_date`, `hltb_main_story` (`"5,50"` → 5.5 h), `difficulty` | facts in the game view, sorting |
| `description`, `description_short`, `notes`, `dlc` | game view text (`notes` is "My feedback") |
| `single_player`, `local_*`, `online_*`, `lan_*`, `player_info_*_max` | play modes |
| `cover_url` | IGDB cover art from Brain |

## Rate and review from the game view

With `BRAIN_TOKEN` connected, every game view has a **My take** panel: status (Playing, Finished,
Dropped…), a rating out of 20 in half points, and free-text feedback. **Save to Brain** writes only
the fields you changed back to the `imported/game-list` record (`status`, `user_rating`, `notes`) and
keeps the linked `cortex/catalog` item (`state`, `reviewed`) in sync, then refreshes the library.

- `npm run dev`: saving works without a password.
- Deployed behind `nicode-sso`: set `TRUST_PROXY_AUTH=true`.
- Deployed publicly: set `EDIT_PASSWORD`; the panel then asks for it. Without either, the game view stays read-only.

Ratings up to 20 are read as out of 20; older ratings above 20 as out of 100.

## Cover art

Covers are resolved in this order:

1. `cover_url` stored on the Game List record in Brain (from IGDB enrichment).
2. A cover baked into the snapshot by `npm run sync`.
3. `GET /api/cover/[id]`: IGDB when `IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET` are set, then Wikipedia's infobox
   art. Results are cached (Next fetch cache and `s-maxage`), so each game is looked up rarely.
4. Generated poster art, so nothing ever looks broken.

## Keeping it fresh

- **Automatically**: the cached library revalidates every few minutes, and edits made in Gamelist expire the cache immediately via `updateTag("library")`.
- **Snapshot**: `npm run sync` (needs `BRAIN_TOKEN`) rewrites `src/data/library.json` and bakes in covers.
  Add `-- --refresh-covers` to look covers up again, or `-- --no-covers` to skip them.
- **On demand**: `POST /api/revalidate` refreshes immediately when it carries `Authorization: Bearer $REVALIDATE_SECRET`.

```bash
curl -X POST -H "Authorization: Bearer $REVALIDATE_SECRET" https://gamelist.nicode.eu/api/revalidate
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run lint` | ESLint (Next.js core web vitals + React Compiler rules) |
| `npm run typecheck` | Route type generation + `tsc` |
| `npm test` | Vitest: normalization, filters, stats, cover matching, Brain API client, snapshot integrity |
| `npm run sync` | Refresh the snapshot from Brain |

## Project layout

```
src/app/                 page, layout, OG image, API routes (cover lookup, revalidate)
src/components/          hero + cover wall, now playing, stats + charts, collection, game modal, chrome
src/lib/                 Brain client + normalizer, library loader, covers, stats, filters, GSAP setup
src/data/library.json    snapshot used when Brain API is not configured
scripts/sync-brain.ts    snapshot + cover baking
presentation/            a 36-second film of the app, made with HyperFrames (see its README)
```

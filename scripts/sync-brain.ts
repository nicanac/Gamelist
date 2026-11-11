/**
 * Pulls the Game Library from the Brain (`cortex/catalog` `games` +
 * `imported/game-list`) into `src/data/library.json` and bakes in cover art,
 * so the app has fast, stable fallback data even without `BRAIN_TOKEN`.
 *
 *   npm run sync                    # reuse covers resolved by earlier syncs
 *   npm run sync -- --refresh-covers
 *   npm run sync -- --no-covers
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchGamesFromBrain, getBrainConfig } from "../src/lib/brain";
import { createLimiter, igdbFromEnv, resolveCover } from "../src/lib/covers";
import type { Game, Library } from "../src/lib/types";

const OUTPUT = path.join(process.cwd(), "src/data/library.json");
const args = new Set(process.argv.slice(2));

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function readPreviousCovers(): Promise<Map<string, string>> {
  if (args.has("--refresh-covers") || !existsSync(OUTPUT)) return new Map();
  const previous = JSON.parse(await readFile(OUTPUT, "utf8")) as Library;
  return new Map(previous.games.filter((game) => game.cover).map((game) => [game.id, game.cover!]));
}

async function main() {
  const config = getBrainConfig();
  if (!config) {
    console.error("Set BRAIN_TOKEN in .env.local (or env) first.");
    process.exit(1);
  }

  console.log(`Reading the games catalog from ${config.apiUrl}…`);
  let games: Game[] = await fetchGamesFromBrain(config);
  console.log(`  ${games.length} games`);

  if (!args.has("--no-covers")) games = await addCovers(games);

  const library: Library = { games, source: "snapshot", syncedAt: new Date().toISOString() };
  await writeFile(OUTPUT, `${JSON.stringify(library, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}`);
}

async function addCovers(games: Game[]) {
  const previous = await readPreviousCovers();
  const igdb = igdbFromEnv();
  const lookupQueue = createLimiter(4);
  const sources = new Map<string, number>();
  const tally = (game: Game, source: string, cover = game.cover): Game => {
    sources.set(source, (sources.get(source) ?? 0) + 1);
    return { ...game, cover };
  };

  console.log(`Resolving covers${igdb ? " (IGDB + Wikipedia)" : " (Wikipedia; set IGDB_CLIENT_ID/SECRET for sharper art)"}…`);
  const result = await Promise.all(
    games.map(async (game): Promise<Game> => {
      if (game.cover) return tally(game, "brain cover");
      const cached = previous.get(game.id);
      if (cached) return tally(game, "previous sync", cached);

      const year = game.releaseDate ? Number(game.releaseDate.slice(0, 4)) : null;
      const lookup = await lookupQueue(() => resolveCover({ name: game.name, platform: game.platform, year }, { igdb }));
      if (lookup.url && lookup.source) return tally(game, lookup.source, lookup.url);
      return tally(game, lookup.degraded ? "failed (retry later)" : "not found");
    }),
  );

  for (const [source, total] of sources) console.log(`  ${source.padEnd(22)} ${total}`);
  return result;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

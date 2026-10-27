import { cacheLife, cacheTag } from "next/cache";
import snapshotFile from "@/data/library.json";
import { fetchGamesFromNotion, getNotionConfig } from "./notion";
import type { Game, Library } from "./types";

export const LIBRARY_TAG = "library";

const snapshot = snapshotFile as unknown as Library;

/**
 * The game library, read live from Notion when `NOTION_TOKEN` is configured
 * and from the committed snapshot otherwise. Cached for an hour and tagged so
 * `/api/revalidate` can refresh it on demand.
 */
export async function getLibrary(): Promise<Library> {
  "use cache";
  cacheLife("hours");
  cacheTag(LIBRARY_TAG);

  const config = getNotionConfig();
  if (!config) return { ...snapshot, source: "snapshot" };

  try {
    const games = await fetchGamesFromNotion(config);
    return { games: withSnapshotCovers(games), source: "notion", syncedAt: new Date().toISOString() };
  } catch (error) {
    console.error("[library] Reading Notion failed; serving the snapshot instead.", error);
    return { ...snapshot, source: "snapshot" };
  }
}

/** Reuses covers that `npm run sync` already resolved, unless Notion has its own. */
function withSnapshotCovers(games: Game[]): Game[] {
  const covers = new Map(snapshot.games.map((game) => [game.id, game.cover]));
  return games.map((game) => ({ ...game, cover: game.cover ?? covers.get(game.id) ?? null }));
}

import { cacheLife, cacheTag } from "next/cache";
import snapshotFile from "@/data/library.json";
import { fetchGamesFromBrain, getBrainConfig, getLatestCommit } from "./brain";
import type { Game, Library } from "./types";

export const LIBRARY_TAG = "library";

const snapshot = snapshotFile as unknown as Library;

/**
 * The game library, read live from the Brain (`cortex/catalog` `games` +
 * `imported/game-list`) when `BRAIN_TOKEN` is configured and from the committed
 * snapshot otherwise. Cached for a few minutes and tagged so edits and
 * `/api/revalidate` refresh it immediately.
 */
export async function getLibrary(): Promise<Library> {
  "use cache";
  cacheLife("minutes");
  cacheTag(LIBRARY_TAG);

  const config = getBrainConfig();
  if (!config) return { ...snapshot, source: "snapshot" };

  try {
    const games = await fetchGamesFromBrain(config, getLatestCommit());
    return { games: withSnapshotCovers(games), source: "brain", syncedAt: new Date().toISOString() };
  } catch (error) {
    console.error("[library] Reading Brain failed; serving the snapshot instead.", error);
    return { ...snapshot, source: "snapshot" };
  }
}

/** Reuses covers that `npm run sync` already resolved, unless the Brain record has its own. */
function withSnapshotCovers(games: Game[]): Game[] {
  const covers = new Map(snapshot.games.map((game) => [game.id, game.cover]));
  return games.map((game) => ({ ...game, cover: game.cover ?? covers.get(game.id) ?? null }));
}

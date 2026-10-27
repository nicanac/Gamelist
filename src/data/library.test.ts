import { describe, expect, it } from "vitest";
import { GAME_STATUSES, type Library } from "@/lib/types";
import snapshot from "./library.json";

const library = snapshot as unknown as Library;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("committed library snapshot", () => {
  it("has games with unique ids and slugs", () => {
    expect(library.games.length).toBeGreaterThan(0);
    expect(new Set(library.games.map((game) => game.id)).size).toBe(library.games.length);
    expect(new Set(library.games.map((game) => game.slug)).size).toBe(library.games.length);
    expect(Number.isNaN(Date.parse(library.syncedAt))).toBe(false);
  });

  it.each(library.games.map((game) => [game.name, game] as const))("%s is well formed", (_name, game) => {
    expect(game.id).toMatch(/^[0-9a-f]{32}$/);
    expect(game.slug).toMatch(/^[a-z0-9-]+$/);
    expect(GAME_STATUSES).toContain(game.status);
    if (game.metacritic != null) expect(game.metacritic).toBeGreaterThan(0);
    if (game.metacritic != null) expect(game.metacritic).toBeLessThanOrEqual(100);
    if (game.rating != null) expect(game.rating).toBeLessThanOrEqual(100);
    if (game.releaseDate) expect(game.releaseDate).toMatch(ISO_DATE);
    if (game.hltbHours != null) expect(game.hltbHours).toBeGreaterThan(0);
    if (game.cover) expect(game.cover).toMatch(/^(https:\/\/|\/api\/cover\/)/);
    expect(game.notionUrl).toMatch(/^https:\/\//);
  });
});

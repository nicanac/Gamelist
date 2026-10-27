import type { Game } from "./types";

/** Builds a `Game` with sensible defaults for tests. */
export function makeGame(overrides: Partial<Game> = {}): Game {
  const name = overrides.name ?? "Test Game";
  return {
    id: overrides.id ?? name.toLowerCase().replace(/\W/g, "").padEnd(32, "0").slice(0, 32),
    slug: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    platform: "Nintendo Switch",
    status: "Not started",
    metacritic: null,
    rating: null,
    genres: [],
    franchises: [],
    developers: [],
    publishers: [],
    labels: [],
    difficulty: null,
    releaseDate: null,
    addedOn: null,
    hltbHours: null,
    playtimeHours: null,
    summary: null,
    description: null,
    dlc: null,
    notes: null,
    modes: { solo: true, localCoop: false, localVersus: false, onlineCoop: false, onlineVersus: false, lan: false },
    maxPlayers: null,
    cover: null,
    notionUrl: "https://www.notion.so/test",
    ...overrides,
  };
}

import { describe, expect, it } from "vitest";
import {
  assignSlugs,
  normalizeBrainGame,
  normalizeRating,
  parseHours,
  splitLabels,
  toStatus,
  type BrainRecordLike,
} from "./normalize";
import type { Game } from "./types";

function deadCellsCatalog(overrides: Partial<BrainRecordLike> = {}): BrainRecordLike {
  return {
    id: "707f02a4-1111-4111-8111-111111111111",
    title: "Dead Cells",
    updated_at: "2026-11-10T11:13:55Z",
    props: {
      catalog: "games",
      key: "0b133b50-d15f-413d-abb7-6913b255bff5",
      category: "PlayStation 4 & 3",
      platform: "PlayStation 4",
      state: "In use",
      score: 88,
      year: 2018,
      publisher: "Motion Twin",
      description: "Fallback catalog description.",
    },
    ...overrides,
  };
}

function deadCellsGameList(overrides: Partial<BrainRecordLike> = {}): BrainRecordLike {
  return {
    id: "0b133b50-d15f-413d-abb7-6913b255bff5",
    title: "Dead Cells",
    updated_at: "2026-11-10T11:13:55Z",
    props: {
      platforms: "PlayStation 4",
      status: "Done",
      mc_score: 88,
      user_rating: 18,
      genres: ["Platform", "Indie"],
      franchises: [],
      developers: ["Motion Twin"],
      publishers: ["Motion Twin"],
      labels: "Rogue-lite, Metroidvania, , Indie",
      difficulty: "Hard",
      release_date: { start: "2018-08-07", end: null, time_zone: null },
      added_on: null,
      hltb_main_story: "14,50",
      playtime_minutes: 0,
      description: "Kill, die, learn, repeat.\n\n\n\nNo checkpoints.",
      description_short: "Roguelite Metroidvania.",
      dlc: "",
      notes: "",
      single_player: true,
      local_coop_story: false,
      online_versus: true,
      player_info_online_versus_mode_max: 4,
      cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1234.jpg",
    },
    ...overrides,
  };
}

describe("parseHours", () => {
  it.each([
    ["5,50", 5.5],
    ["14", 14],
    ["~14h", 14],
    [" 37 ", 37],
    [12.25, 12.3],
    ["0,00", null],
    ["", null],
    ["n/a", null],
    [null, null],
  ])("parses %j as %j", (input, expected) => {
    expect(parseHours(input)).toBe(expected);
  });
});

describe("normalizeRating", () => {
  it("reads ratings up to 20 as out of 20, larger ones as out of 100", () => {
    expect(normalizeRating(18)).toBe(90);
    expect(normalizeRating(8)).toBe(40);
    expect(normalizeRating(4)).toBe(20);
    expect(normalizeRating(90)).toBe(90);
    expect(normalizeRating(140)).toBe(100);
  });

  it("keeps half points out of 20 exact", () => {
    expect(normalizeRating(17.5)).toBe(87.5);
  });

  it("treats zero and empty as unrated", () => {
    expect(normalizeRating(0)).toBeNull();
    expect(normalizeRating(null)).toBeNull();
  });
});

describe("toStatus", () => {
  it("matches Game List status names case-insensitively", () => {
    expect(toStatus("Want to Play")).toBe("Want to Play");
    expect(toStatus("done")).toBe("Done");
  });

  it("falls back to the database default", () => {
    expect(toStatus(null)).toBe("Not started");
    expect(toStatus("Archived")).toBe("Not started");
  });
});

describe("splitLabels", () => {
  it("splits, trims and de-duplicates", () => {
    expect(splitLabels("Zelda, Co-op; Zelda ,")).toEqual(["Zelda", "Co-op"]);
    expect(splitLabels(null)).toEqual([]);
  });
});

describe("normalizeBrainGame", () => {
  it("maps every displayed property from the linked Game List record", () => {
    const game = normalizeBrainGame(deadCellsCatalog(), deadCellsGameList());
    expect(game).toMatchObject({
      id: "0b133b50-d15f-413d-abb7-6913b255bff5",
      catalogId: "707f02a4-1111-4111-8111-111111111111",
      gameListId: "0b133b50-d15f-413d-abb7-6913b255bff5",
      name: "Dead Cells",
      platform: "PlayStation 4",
      status: "Done",
      metacritic: 88,
      rating: 90,
      genres: ["Platform", "Indie"],
      developers: ["Motion Twin"],
      labels: ["Rogue-lite", "Metroidvania", "Indie"],
      difficulty: "Hard",
      releaseDate: "2018-08-07",
      addedOn: null,
      hltbHours: 14.5,
      playtimeHours: null,
      description: "Kill, die, learn, repeat.\n\nNo checkpoints.",
      summary: "Roguelite Metroidvania.",
      dlc: null,
      cover: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1234.jpg",
      maxPlayers: 4,
      brainUrl: "https://brain.nicode.eu/r/0b133b50-d15f-413d-abb7-6913b255bff5",
    });
    expect(game.modes).toEqual({
      solo: true,
      localCoop: false,
      localVersus: false,
      onlineCoop: false,
      onlineVersus: true,
      lan: false,
    });
  });

  it("builds a game from a standalone catalog item when no Game List record exists", () => {
    const game = normalizeBrainGame(
      deadCellsCatalog({
        id: "11111111-2222-4333-8444-555555555555",
        props: {
          catalog: "games",
          key: "hades-ii",
          category: "PC & Xbox",
          platform: "PC (Microsoft Windows)",
          state: "Trying",
          score: 94,
          rating: 4,
          publisher: "Supergiant Games",
          description: "Sequel to Hades.",
        },
        body: "## Review\n\nAmazing combat.",
      }),
    );
    expect(game).toMatchObject({
      id: "11111111-2222-4333-8444-555555555555",
      catalogId: "11111111-2222-4333-8444-555555555555",
      gameListId: null,
      platform: "PC (Microsoft Windows)",
      status: "In progress",
      metacritic: 94,
      rating: 80,
      publishers: ["Supergiant Games"],
      description: "Sequel to Hades.",
      notes: "Amazing combat.",
      brainUrl: "https://brain.nicode.eu/r/11111111-2222-4333-8444-555555555555",
    });
  });

  it("prefers a newer catalog state change over a stale Game List status", () => {
    const game = normalizeBrainGame(
      deadCellsCatalog({
        updated_at: "2026-11-11T12:00:00Z",
        props: { catalog: "games", key: "0b133b50-d15f-413d-abb7-6913b255bff5", state: "Trying" },
      }),
      deadCellsGameList({
        updated_at: "2026-11-10T12:00:00Z",
      }),
    );
    expect(game.status).toBe("In progress");
  });

  it("drops a summary that repeats the description and a zero Metacritic score", () => {
    const gl = deadCellsGameList();
    gl.props = { ...gl.props, description_short: "Same", description: "Same", mc_score: 0 };
    const game = normalizeBrainGame(deadCellsCatalog(), gl);
    expect(game.summary).toBeNull();
    expect(game.metacritic).toBeNull();
  });
});

describe("assignSlugs", () => {
  const game = (id: string, name: string, platform: string | null): Game =>
    ({ ...normalizeBrainGame(deadCellsCatalog(), deadCellsGameList()), id, name, platform }) as Game;

  it("keeps slugs unique and stable regardless of input order", () => {
    const games = [
      game("c3", "Doom", "PlayStation 4"),
      game("a1", "Doom", "PC (Microsoft Windows)"),
      game("b2", "Doom", "PC (Microsoft Windows)"),
      game("d4", "Bowser's Fury", "Nintendo Switch"),
    ];
    const slugs = (list: Game[]) => Object.fromEntries(assignSlugs(list).map((entry) => [entry.id, entry.slug]));
    const forward = slugs(games);
    expect(forward).toEqual(slugs([...games].reverse()));
    expect(forward).toEqual({ a1: "doom", b2: "doom-pc", c3: "doom-ps4", d4: "bowsers-fury" });
    expect(
      slugs([
        game("a1", "Doom", "PC (Microsoft Windows)"),
        game("b2", "Doom", "PC (Microsoft Windows)"),
        game("b9", "Doom", "PC (Microsoft Windows)"),
      ]),
    ).toEqual({
      a1: "doom",
      b2: "doom-pc",
      b9: "doom-b9",
    });
  });
});

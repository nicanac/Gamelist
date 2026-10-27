import { describe, expect, it } from "vitest";
import {
  assignSlugs,
  normalizePage,
  normalizeRating,
  parseHours,
  splitLabels,
  toStatus,
  type NotionPageLike,
} from "./normalize";
import type { Game } from "./types";

const text = (value: string) => [{ plain_text: value }];

/** Shaped like a Notion API page from the Game List data source. */
function deadCellsPage(overrides: Partial<NotionPageLike> = {}): NotionPageLike {
  return {
    id: "0b133b50-d15f-413d-abb7-6913b255bff5",
    url: "https://www.notion.so/Dead-Cells-0b133b50d15f413dabb76913b255bff5",
    cover: null,
    properties: {
      name: { type: "title", title: text("Dead Cells") },
      platforms: { type: "select", select: { name: "PlayStation 4" } },
      status: { type: "status", status: { name: "Done" } },
      mc_score: { type: "number", number: 88 },
      user_rating: { type: "number", number: 18 },
      genres: { type: "multi_select", multi_select: [{ name: "Platform" }, { name: "Indie" }] },
      franchises: { type: "multi_select", multi_select: [] },
      developers: { type: "multi_select", multi_select: [{ name: "Motion Twin" }] },
      publishers: { type: "multi_select", multi_select: [{ name: "Motion Twin" }] },
      labels: { type: "rich_text", rich_text: text("Rogue-lite, Metroidvania, , Indie") },
      difficulty: { type: "rich_text", rich_text: text("Hard") },
      release_date: { type: "date", date: { start: "2018-08-07", end: null } },
      added_on: { type: "date", date: null },
      hltb_main_story: { type: "rich_text", rich_text: text("14,50") },
      playtime_minutes: { type: "number", number: 0 },
      description: { type: "rich_text", rich_text: text("Kill, die, learn, repeat.\n\n\n\nNo checkpoints.") },
      description_short: { type: "rich_text", rich_text: text("Roguelite Metroidvania.") },
      dlc: { type: "rich_text", rich_text: [] },
      notes: { type: "rich_text", rich_text: [] },
      single_player: { type: "checkbox", checkbox: true },
      local_coop_story: { type: "checkbox", checkbox: false },
      online_versus: { type: "checkbox", checkbox: true },
      player_info_online_versus_mode_max: { type: "number", number: 4 },
      Platform: { type: "relation", relation: [{ id: "x" }] },
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
  it("normalizes mixed scales to 0–100", () => {
    expect(normalizeRating(18)).toBe(90); // out of 20
    expect(normalizeRating(90)).toBe(90); // out of 100
    expect(normalizeRating(8)).toBe(80); // out of 10
    expect(normalizeRating(4)).toBe(80); // stars
    expect(normalizeRating(140)).toBe(100);
  });

  it("treats zero and empty as unrated", () => {
    expect(normalizeRating(0)).toBeNull();
    expect(normalizeRating(null)).toBeNull();
  });
});

describe("toStatus", () => {
  it("matches Notion status names case-insensitively", () => {
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

describe("normalizePage", () => {
  it("maps every displayed property", () => {
    const game = normalizePage(deadCellsPage());
    expect(game).toMatchObject({
      id: "0b133b50d15f413dabb76913b255bff5",
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
      cover: null,
      maxPlayers: 4,
      notionUrl: "https://www.notion.so/Dead-Cells-0b133b50d15f413dabb76913b255bff5",
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

  it("tolerates missing and mistyped properties", () => {
    const game = normalizePage({
      id: "abc",
      url: "https://notion.so/abc",
      properties: { name: { type: "number", number: 3 }, mc_score: { type: "rich_text", rich_text: text("88") } },
    });
    expect(game.name).toBe("Untitled");
    expect(game.metacritic).toBeNull();
    expect(game.status).toBe("Not started");
    expect(game.genres).toEqual([]);
  });

  it("drops a summary that repeats the description and a zero Metacritic score", () => {
    const page = deadCellsPage();
    page.properties.description_short = { type: "rich_text", rich_text: text("Same") };
    page.properties.description = { type: "rich_text", rich_text: text("Same") };
    page.properties.mc_score = { type: "number", number: 0 };
    const game = normalizePage(page);
    expect(game.summary).toBeNull();
    expect(game.metacritic).toBeNull();
  });

  it("uses an external page cover as-is", () => {
    const game = normalizePage(deadCellsPage({ cover: { type: "external", external: { url: "https://img.test/a.jpg" } } }));
    expect(game.cover).toBe("https://img.test/a.jpg");
  });

  it("routes expiring Notion-hosted covers through the cover API", () => {
    const game = normalizePage(deadCellsPage({ cover: { type: "file", file: { url: "https://s3.test/signed" } } }));
    expect(game.cover).toBe("/api/cover/0b133b50d15f413dabb76913b255bff5?notion=1");
  });

  it("prefers a `cover` URL property over the page cover", () => {
    const page = deadCellsPage({ cover: { type: "external", external: { url: "https://img.test/page.jpg" } } });
    page.properties.cover = { type: "url", url: "https://img.test/property.jpg" };
    expect(normalizePage(page).cover).toBe("https://img.test/property.jpg");
  });
});

describe("assignSlugs", () => {
  const game = (id: string, name: string, platform: string | null): Game =>
    ({ ...normalizePage(deadCellsPage()), id, name, platform }) as Game;

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
    expect(slugs([game("a1", "Doom", "PC (Microsoft Windows)"), game("b2", "Doom", "PC (Microsoft Windows)"), game("b9", "Doom", "PC (Microsoft Windows)")])).toEqual({
      a1: "doom",
      b2: "doom-pc",
      b9: "doom-b9",
    });
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filterGames, isFiltered, matchesQuery, type GameFilters } from "./filters";
import { makeGame } from "./test-utils";

const zelda = makeGame({
  name: "The Legend of Zelda: Breath of the Wild",
  platform: "Nintendo Switch",
  status: "Done",
  metacritic: 97,
  releaseDate: "2017-03-03",
  hltbHours: 50,
  genres: ["Adventure"],
  franchises: ["The Legend of Zelda"],
  developers: ["Nintendo EPD"],
});
const pokemon = makeGame({
  name: "Pokémon Legends: Arceus",
  platform: "Nintendo Switch",
  status: "In progress",
  metacritic: 83,
  releaseDate: "2022-01-28",
  hltbHours: 26,
  genres: ["Role-playing (RPG)", "Adventure"],
});
const bloodborne = makeGame({
  name: "Bloodborne",
  platform: "PlayStation 4",
  status: "Want to Play",
  metacritic: null,
  releaseDate: null,
  genres: ["Role-playing (RPG)"],
  labels: ["Soulslike"],
});
const fury = makeGame({ name: "Super Mario 3D World + Bowser's Fury", platform: "Nintendo Switch", metacritic: 89 });
const games = [bloodborne, zelda, fury, pokemon];

const filters = (overrides: Partial<GameFilters>): GameFilters => ({ ...DEFAULT_FILTERS, ...overrides });

describe("matchesQuery", () => {
  it("ignores accents, case and apostrophes", () => {
    expect(matchesQuery(pokemon, "POKEMON")).toBe(true);
    expect(matchesQuery(fury, "bowsers")).toBe(true);
  });

  it("requires every word, anywhere in the searchable fields", () => {
    expect(matchesQuery(zelda, "zelda epd")).toBe(true);
    expect(matchesQuery(zelda, "zelda sony")).toBe(false);
    expect(matchesQuery(bloodborne, "soulslike ps4")).toBe(true);
  });

  it("matches everything for an empty query", () => {
    expect(matchesQuery(zelda, "   ")).toBe(true);
  });
});

describe("filterGames", () => {
  it("combines status, platform and genre filters", () => {
    expect(filterGames(games, filters({ statuses: ["Done", "In progress"] })).map((g) => g.name)).toEqual([
      zelda.name,
      pokemon.name,
    ]);
    expect(filterGames(games, filters({ platforms: ["PlayStation 4"] }))).toEqual([bloodborne]);
    expect(filterGames(games, filters({ genre: "Role-playing (RPG)", platforms: ["Nintendo Switch"] }))).toEqual([
      pokemon,
    ]);
  });

  it("sorts by title ignoring a leading article", () => {
    expect(filterGames(games, DEFAULT_FILTERS).map((g) => g.name)).toEqual([
      bloodborne.name,
      zelda.name,
      pokemon.name,
      fury.name,
    ]);
  });

  it("keeps missing values last for numeric sorts", () => {
    expect(filterGames(games, filters({ sort: "metacritic" })).map((g) => g.metacritic)).toEqual([97, 89, 83, null]);
    expect(filterGames(games, filters({ sort: "newest" }))[0]).toBe(pokemon);
    expect(filterGames(games, filters({ sort: "oldest" }))[0]).toBe(zelda);
    expect(filterGames(games, filters({ sort: "shortest" })).map((g) => g.hltbHours)).toEqual([26, 50, null, null]);
  });

  it("does not mutate the input", () => {
    const before = [...games];
    filterGames(games, filters({ sort: "metacritic" }));
    expect(games).toEqual(before);
  });
});

describe("isFiltered", () => {
  it("ignores sort and blank queries", () => {
    expect(isFiltered(filters({ sort: "newest", query: "  " }))).toBe(false);
    expect(isFiltered(filters({ genre: "Adventure" }))).toBe(true);
  });
});

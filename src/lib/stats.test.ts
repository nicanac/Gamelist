import { describe, expect, it } from "vitest";
import { computeStats } from "./stats";
import { makeGame } from "./test-utils";

describe("computeStats", () => {
  const games = [
    makeGame({ name: "A", status: "Done", metacritic: 90, hltbHours: 10, releaseDate: "2017-03-03", genres: ["Adventure"], franchises: ["Zelda"] }),
    makeGame({ name: "B", status: "Done", metacritic: 80, hltbHours: 20, releaseDate: "2020-01-01", genres: ["Adventure", "Puzzle"], franchises: ["Zelda"] }),
    makeGame({ name: "C", status: "In progress", hltbHours: 30, platform: "PlayStation 5", genres: ["Shooter"] }),
    makeGame({ name: "D", status: "Want to Play", platform: "PlayStation 5" }),
    makeGame({ name: "E", status: "Stalled", hltbHours: 5, platform: null }),
    makeGame({ name: "F", status: "Dropped", hltbHours: 99 }),
  ];
  const stats = computeStats(games);

  it("counts statuses in display order", () => {
    expect(stats.total).toBe(6);
    expect(stats.byStatus.map((entry) => entry.count)).toEqual([1, 0, 2, 1, 1, 1]);
    expect(stats.finished).toBe(2);
    expect(stats.playing).toBe(1);
    expect(stats.upNext).toBe(2);
    expect(stats.finishedShare).toBeCloseTo(1 / 3);
  });

  it("averages Metacritic over scored games only", () => {
    expect(stats.averageMetacritic).toBe(85);
    expect(stats.metacriticCount).toBe(2);
  });

  it("sums backlog hours for open games and reports coverage", () => {
    expect(stats.backlogHours).toBe(35);
    expect(stats.backlogHoursCoverage).toEqual({ known: 2, total: 3 });
  });

  it("ranks platforms, genres and franchises", () => {
    expect(stats.byPlatform.map((entry) => [entry.short, entry.count])).toEqual([
      ["Switch", 3],
      ["PS5", 2],
      ["Unknown", 1],
    ]);
    expect(stats.platformCount).toBe(2);
    expect(stats.byGenre[0]).toEqual({ name: "Adventure", count: 2 });
    expect(stats.byFranchise).toEqual([{ name: "Zelda", count: 2 }]);
  });

  it("fills release years without gaps", () => {
    expect(stats.byYear.map((entry) => entry.year)).toEqual([2017, 2018, 2019, 2020]);
    expect(stats.byYear.map((entry) => entry.count)).toEqual([1, 0, 0, 1]);
    expect(stats.datedCount).toBe(2);
  });

  it("handles an empty library", () => {
    const empty = computeStats([]);
    expect(empty.finishedShare).toBe(0);
    expect(empty.averageMetacritic).toBeNull();
    expect(empty.byYear).toEqual([]);
  });
});

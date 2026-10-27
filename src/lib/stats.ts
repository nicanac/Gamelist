import { platformMeta, type PlatformFamily } from "./platforms";
import { STATUS_ORDER } from "./status";
import type { Game, GameStatus } from "./types";

export interface CountEntry {
  name: string;
  count: number;
}

export interface PlatformEntry extends CountEntry {
  short: string;
  family: PlatformFamily;
}

export interface LibraryStats {
  total: number;
  byStatus: { status: GameStatus; count: number }[];
  finished: number;
  playing: number;
  /** Not started, Want to Play and Stalled. */
  upNext: number;
  finishedShare: number;
  averageMetacritic: number | null;
  metacriticCount: number;
  /** HowLongToBeat hours left for everything not finished or dropped. */
  backlogHours: number;
  backlogHoursCoverage: { known: number; total: number };
  byPlatform: PlatformEntry[];
  byGenre: CountEntry[];
  byFranchise: CountEntry[];
  byYear: { year: number; count: number }[];
  datedCount: number;
  platformCount: number;
  franchiseCount: number;
}

function countBy(values: string[]): CountEntry[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const UP_NEXT: GameStatus[] = ["Not started", "Want to Play", "Stalled"];
const OPEN: GameStatus[] = ["In progress", ...UP_NEXT];

export function computeStats(games: Game[]): LibraryStats {
  const total = games.length;
  const statusCount = (status: GameStatus) => games.filter((game) => game.status === status).length;
  const finished = statusCount("Done");
  const scored = games.filter((game) => game.metacritic != null);
  const open = games.filter((game) => OPEN.includes(game.status));
  const openWithHours = open.filter((game) => game.hltbHours != null);

  const years = games
    .map((game) => (game.releaseDate ? Number(game.releaseDate.slice(0, 4)) : NaN))
    .filter((year) => Number.isFinite(year));
  const byYear: LibraryStats["byYear"] = [];
  if (years.length) {
    const yearCounts = countBy(years.map(String));
    const lookup = new Map(yearCounts.map((entry) => [Number(entry.name), entry.count]));
    for (let year = Math.min(...years); year <= Math.max(...years); year += 1) {
      byYear.push({ year, count: lookup.get(year) ?? 0 });
    }
  }

  const byPlatform = countBy(games.map((game) => game.platform ?? "Unknown")).map((entry) => {
    const meta = platformMeta(entry.name === "Unknown" ? null : entry.name);
    return { ...entry, short: meta.short, family: meta.family };
  });

  return {
    total,
    byStatus: STATUS_ORDER.map(({ status }) => ({ status, count: statusCount(status) })),
    finished,
    playing: statusCount("In progress"),
    upNext: games.filter((game) => UP_NEXT.includes(game.status)).length,
    finishedShare: total ? finished / total : 0,
    averageMetacritic: scored.length
      ? Math.round((scored.reduce((sum, game) => sum + (game.metacritic ?? 0), 0) / scored.length) * 10) / 10
      : null,
    metacriticCount: scored.length,
    backlogHours: Math.round(openWithHours.reduce((sum, game) => sum + (game.hltbHours ?? 0), 0)),
    backlogHoursCoverage: { known: openWithHours.length, total: open.length },
    byPlatform,
    byGenre: countBy(games.flatMap((game) => game.genres)),
    byFranchise: countBy(games.flatMap((game) => game.franchises)),
    byYear,
    datedCount: years.length,
    platformCount: byPlatform.filter((entry) => entry.name !== "Unknown").length,
    franchiseCount: new Set(games.flatMap((game) => game.franchises)).size,
  };
}

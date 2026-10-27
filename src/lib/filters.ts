import { compareTitles } from "./normalize";
import { platformShort } from "./platforms";
import { foldText } from "./text";
import type { Game, GameStatus } from "./types";

export type SortKey = "name" | "metacritic" | "newest" | "oldest" | "shortest";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "A → Z" },
  { key: "metacritic", label: "Metacritic" },
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "shortest", label: "Shortest" },
];

export interface GameFilters {
  query: string;
  statuses: GameStatus[];
  platforms: string[];
  genre: string | null;
  sort: SortKey;
}

export const DEFAULT_FILTERS: GameFilters = {
  query: "",
  statuses: [],
  platforms: [],
  genre: null,
  sort: "name",
};

const haystacks = new WeakMap<Game, string>();

function haystack(game: Game): string {
  let value = haystacks.get(game);
  if (value === undefined) {
    value = foldText(
      [
        game.name,
        game.platform ?? "",
        platformShort(game.platform),
        ...game.franchises,
        ...game.developers,
        ...game.publishers,
        ...game.genres,
        ...game.labels,
      ].join(" "),
    );
    haystacks.set(game, value);
  }
  return value;
}

/** Every word of the query must appear somewhere in the game's searchable text. */
export function matchesQuery(game: Game, query: string): boolean {
  const words = foldText(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const text = haystack(game);
  return words.every((word) => text.includes(word));
}

/** Nulls sort last whichever direction is asked for. */
function byNumber(get: (game: Game) => number | null, direction: 1 | -1) {
  return (a: Game, b: Game) => {
    const left = get(a);
    const right = get(b);
    if (left == null && right == null) return compareTitles(a.name, b.name);
    if (left == null) return 1;
    if (right == null) return -1;
    return (left - right) * direction || compareTitles(a.name, b.name);
  };
}

const releaseTime = (game: Game) => (game.releaseDate ? Date.parse(game.releaseDate) : null);

const COMPARATORS: Record<SortKey, (a: Game, b: Game) => number> = {
  name: (a, b) => compareTitles(a.name, b.name),
  metacritic: byNumber((game) => game.metacritic, -1),
  newest: byNumber(releaseTime, -1),
  oldest: byNumber(releaseTime, 1),
  shortest: byNumber((game) => game.hltbHours, 1),
};

export function filterGames(games: Game[], filters: GameFilters): Game[] {
  return games
    .filter(
      (game) =>
        (!filters.statuses.length || filters.statuses.includes(game.status)) &&
        (!filters.platforms.length || (game.platform != null && filters.platforms.includes(game.platform))) &&
        (!filters.genre || game.genres.includes(filters.genre)) &&
        matchesQuery(game, filters.query),
    )
    .sort(COMPARATORS[filters.sort]);
}

export function isFiltered(filters: GameFilters): boolean {
  return Boolean(filters.query.trim() || filters.statuses.length || filters.platforms.length || filters.genre);
}

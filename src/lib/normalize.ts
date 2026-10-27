import { GAME_STATUSES, type Game, type GameStatus, type PlayModes } from "./types";
import { cleanText, slugify } from "./text";
import { platformShort } from "./platforms";

/**
 * The subset of a Notion page object this module reads. Matches
 * `PageObjectResponse` from @notionhq/client structurally, so tests and the
 * snapshot builder can pass plain objects.
 */
export interface NotionPageLike {
  id: string;
  url: string;
  cover?:
    | { type: "external"; external: { url: string } }
    | { type: "file"; file: { url: string; expiry_time?: string } }
    | null;
  properties: Record<string, NotionProperty | undefined>;
}

/** A Notion property value, e.g. `{ type: "number", number: 88 }`. */
export type NotionProperty = { type: string } & Record<string, unknown>;

type RichText = { plain_text: string };
type NamedOption = { name: string } | null;
type Props = NotionPageLike["properties"];

function readText(props: Props, key: string): string | null {
  const prop = props[key];
  if (!prop) return null;
  if (prop.type === "title" || prop.type === "rich_text") {
    const parts = prop[prop.type] as RichText[] | undefined;
    return cleanText(parts?.map((part) => part.plain_text).join(""));
  }
  if (prop.type === "select" || prop.type === "status") {
    return (prop[prop.type] as NamedOption)?.name?.trim() || null;
  }
  return null;
}

function readNumber(props: Props, key: string): number | null {
  const prop = props[key];
  if (prop?.type !== "number") return null;
  const value = prop.number;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readOptions(props: Props, key: string): string[] {
  const prop = props[key];
  if (prop?.type !== "multi_select") return [];
  const options = (prop.multi_select as { name: string }[] | undefined) ?? [];
  return unique(options.map((option) => option.name.trim()));
}

function readDate(props: Props, key: string): string | null {
  const prop = props[key];
  if (prop?.type !== "date") return null;
  const date = prop.date as { start?: string } | null;
  return date?.start ? date.start.slice(0, 10) : null;
}

function readCheckbox(props: Props, key: string): boolean {
  const prop = props[key];
  return prop?.type === "checkbox" && prop.checkbox === true;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/** Accepts "5,50", "14", "~14h" or "0,00" (unknown). */
export function parseHours(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const match = String(value).replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const hours = Number.parseFloat(match[0]);
  return hours > 0 ? Math.round(hours * 10) / 10 : null;
}

/**
 * Personal ratings in the database mix scales (e.g. 18 means 18/20, 90 means
 * 90/100). Normalize to 0–100: ≤5 stars, ≤10, ≤20, otherwise /100.
 */
export function normalizeRating(value: number | null): number | null {
  if (value == null || value <= 0) return null;
  if (value <= 5) return Math.round(value * 20);
  if (value <= 10) return Math.round(value * 10);
  if (value <= 20) return Math.round(value * 5);
  return Math.min(100, Math.round(value));
}

export function toStatus(value: string | null): GameStatus {
  const match = GAME_STATUSES.find((status) => status.toLowerCase() === value?.toLowerCase());
  return match ?? "Not started";
}

export function splitLabels(value: string | null): string[] {
  if (!value) return [];
  return unique(value.split(/[,;]/).map((label) => label.trim()));
}

const PLAYER_COUNT_KEYS = [
  "local_alternating",
  "local_coop_non_story_mode",
  "local_coop_story_mode",
  "local_team_versus_mode",
  "local_versus_mode",
  "lan_coop_non_story_mode",
  "lan_coop_story_mode",
  "lan_team_versus_mode",
  "lan_versus_mode",
  "online_coop_non_story_mode",
  "online_coop_story_mode",
  "online_team_versus_mode",
  "online_versus_mode",
];

function readModes(props: Props): PlayModes {
  const on = (key: string) => readCheckbox(props, key);
  return {
    solo: on("single_player") || on("single_player_non_story"),
    localCoop: on("local_coop_story") || on("local_coop_non_story"),
    localVersus: on("local_versus") || on("local_team_versus") || on("local_alternating"),
    onlineCoop: on("online_coop_story") || on("online_coop_non_story"),
    onlineVersus: on("online_versus") || on("online_team_versus"),
    lan:
      on("lan_coop_story") || on("lan_coop_non_story") || on("lan_versus") || on("lan_team_versus"),
  };
}

function readMaxPlayers(props: Props): number | null {
  const counts = PLAYER_COUNT_KEYS.map((key) => readNumber(props, `player_info_${key}_max`) ?? 0);
  const max = Math.max(0, ...counts);
  return max > 1 ? max : null;
}

/** Notion-hosted files expire after an hour, so they are served through the cover route. */
function readCover(page: NotionPageLike, id: string): string | null {
  const prop = page.properties.cover ?? page.properties.Cover;
  if (prop?.type === "url" && typeof prop.url === "string" && prop.url) return prop.url;
  if (prop?.type === "files") {
    const file = (prop.files as { type: string; external?: { url: string } }[] | undefined)?.[0];
    if (file?.type === "external" && file.external?.url) return file.external.url;
    if (file) return `/api/cover/${id}?notion=1`;
  }
  if (page.cover?.type === "external") return page.cover.external.url;
  if (page.cover?.type === "file") return `/api/cover/${id}?notion=1`;
  return null;
}

/** Maps one row of the "Game List" data source to a `Game` (slug assigned later). */
export function normalizePage(page: NotionPageLike): Game {
  const props = page.properties;
  const id = page.id.replace(/-/g, "");
  const name = readText(props, "name") ?? "Untitled";
  const description = readText(props, "description");
  const summary = readText(props, "description_short");
  const metacritic = readNumber(props, "mc_score");
  const playtimeMinutes = readNumber(props, "playtime_minutes");

  return {
    id,
    slug: "",
    name,
    platform: readText(props, "platforms"),
    status: toStatus(readText(props, "status")),
    metacritic: metacritic && metacritic > 0 ? Math.round(metacritic) : null,
    rating: normalizeRating(readNumber(props, "user_rating")),
    genres: readOptions(props, "genres"),
    franchises: readOptions(props, "franchises"),
    developers: readOptions(props, "developers"),
    publishers: readOptions(props, "publishers"),
    labels: splitLabels(readText(props, "labels")),
    difficulty: readText(props, "difficulty"),
    releaseDate: readDate(props, "release_date"),
    addedOn: readDate(props, "added_on"),
    hltbHours: parseHours(readText(props, "hltb_main_story") ?? readNumber(props, "hltb_main_story")),
    playtimeHours: playtimeMinutes && playtimeMinutes > 0 ? Math.round(playtimeMinutes / 6) / 10 : null,
    summary: summary && summary !== description ? summary : null,
    description,
    dlc: readText(props, "dlc"),
    notes: readText(props, "notes"),
    modes: readModes(props),
    maxPlayers: readMaxPlayers(props),
    cover: readCover(page, id),
    notionUrl: page.url,
  };
}

/**
 * Gives every game a unique, stable slug. Duplicate titles (the same game on
 * two platforms) get the platform appended, then an id fragment if needed.
 */
export function assignSlugs(games: Game[]): Game[] {
  const ordered = [...games].sort(
    (a, b) => a.name.localeCompare(b.name) || (a.platform ?? "").localeCompare(b.platform ?? "") || a.id.localeCompare(b.id),
  );
  const taken = new Set<string>();
  const slugs = new Map<string, string>();
  for (const game of ordered) {
    const base = slugify(game.name);
    let slug = base;
    if (taken.has(slug)) slug = `${base}-${slugify(platformShort(game.platform))}`;
    if (taken.has(slug)) slug = `${base}-${game.id.slice(0, 6)}`;
    taken.add(slug);
    slugs.set(game.id, slug);
  }
  return games.map((game) => ({ ...game, slug: slugs.get(game.id) ?? game.id }));
}

export function sortByName(games: Game[]): Game[] {
  return [...games].sort((a, b) => compareTitles(a.name, b.name));
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function compareTitles(a: string, b: string): number {
  const strip = (value: string) => value.replace(/^the\s+/i, "");
  return collator.compare(strip(a), strip(b));
}

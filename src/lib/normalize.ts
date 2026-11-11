import { catalogStateToStatus, statusToCatalogState } from "./review";
import { platformShort } from "./platforms";
import { cleanText, slugify } from "./text";
import { GAME_STATUSES, type Game, type GameStatus, type PlayModes } from "./types";

/**
 * A record returned by `brain-api` (after resolving select/status/multi_select
 * option IDs to their option names).
 */
export interface BrainRecordLike {
  id: string;
  title?: string | null;
  props?: Record<string, unknown> | null;
  body?: string | null;
  updated_at?: string | null;
}

type Props = Record<string, unknown>;

function readText(props: Props, key: string): string | null {
  const value = props[key];
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readNumber(props: Props, key: string): number | null {
  const value = props[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readOptions(props: Props, key: string): string[] {
  const value = props[key];
  if (Array.isArray(value)) {
    return unique(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()));
  }
  if (typeof value === "string") {
    return unique(value.split(/[,;]/).map((item) => item.trim()));
  }
  return [];
}

function readDate(props: Props, key: string): string | null {
  const value = props[key];
  const raw =
    typeof value === "string"
      ? value
      : value && typeof value === "object" && typeof (value as { start?: unknown }).start === "string"
        ? (value as { start: string }).start
        : null;
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return null;
  return raw.slice(0, 10);
}

function readCheckbox(props: Props, key: string): boolean {
  return props[key] === true;
}

function readHttpUrl(props: Props, key: string): string | null {
  const value = readText(props, key);
  return value && /^https?:\/\//i.test(value) ? value : null;
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
 * Personal ratings are out of 20 (18 means 18/20, half points allowed); older
 * ones above 20 are out of 100. Normalize to 0–100 without losing half points.
 */
export function normalizeRating(value: number | null): number | null {
  if (value == null || value <= 0) return null;
  if (value <= 20) return value * 5;
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
    lan: on("lan_coop_story") || on("lan_coop_non_story") || on("lan_versus") || on("lan_team_versus"),
  };
}

function readMaxPlayers(props: Props): number | null {
  const counts = PLAYER_COUNT_KEYS.map((key) => readNumber(props, `player_info_${key}_max`) ?? 0);
  const max = Math.max(0, ...counts);
  return max > 1 ? max : null;
}

function resolveStatus(catalogRecord: BrainRecordLike, gameListRecord?: BrainRecordLike): GameStatus {
  const catProps = catalogRecord.props ?? {};
  const catState = readText(catProps, "state");

  if (!gameListRecord) {
    return catState ? catalogStateToStatus(catState) : "Not started";
  }

  const glProps = gameListRecord.props ?? {};
  const rawGlStatus = readText(glProps, "status");
  if (!rawGlStatus) {
    return catState ? catalogStateToStatus(catState) : "Not started";
  }

  const glStatus = toStatus(rawGlStatus);
  const catTime = catalogRecord.updated_at ? Date.parse(catalogRecord.updated_at) : NaN;
  const glTime = gameListRecord.updated_at ? Date.parse(gameListRecord.updated_at) : NaN;

  // If the catalog item state was changed more recently in Brain than the Game List row, reflect that change.
  if (catState && Number.isFinite(catTime) && Number.isFinite(glTime) && catTime > glTime) {
    const mappedCatState = catalogStateToStatus(catState);
    if (statusToCatalogState(glStatus) !== statusToCatalogState(mappedCatState)) {
      return mappedCatState;
    }
  }

  return glStatus;
}

function extractStandaloneNotes(body: string | null | undefined): string | null {
  if (!body) return null;
  const trimmed = body.replace(/^#{1,4}[ \t]+Review[ \t]*(?:\r?\n|$)/i, "");
  return cleanText(trimmed);
}

/**
 * Combines a `cortex/catalog` item (`catalog: "games"`) and its linked
 * `imported/game-list` record (if any) into a `Game`.
 */
export function normalizeBrainGame(
  catalogRecord: BrainRecordLike,
  gameListRecord?: BrainRecordLike,
  brainWebUrl = "https://brain.nicode.eu",
): Game {
  const catProps = catalogRecord.props ?? {};
  const glProps = gameListRecord?.props ?? {};
  const id = gameListRecord?.id ?? catalogRecord.id;
  const webBase = brainWebUrl.replace(/\/+$/, "");

  const name =
    cleanText(gameListRecord?.title ?? undefined) ??
    cleanText(catalogRecord.title ?? undefined) ??
    readText(catProps, "name") ??
    "Untitled";

  const description = readText(glProps, "description") ?? readText(catProps, "description");
  const summary = readText(glProps, "description_short");
  const metacritic = readNumber(glProps, "mc_score") ?? readNumber(catProps, "score");
  const playtimeMinutes = readNumber(glProps, "playtime_minutes");

  const glRating = normalizeRating(readNumber(glProps, "user_rating"));
  const catRatingRaw = readNumber(catProps, "rating");
  const fallbackRating =
    !gameListRecord && catRatingRaw && catRatingRaw > 0
      ? Math.min(100, Math.round(catRatingRaw <= 5 ? catRatingRaw * 20 : catRatingRaw))
      : null;

  const glPublishers = readOptions(glProps, "publishers");
  const catPublisher = readText(catProps, "publisher");
  const publishers = glPublishers.length > 0 ? glPublishers : catPublisher ? [catPublisher] : [];

  return {
    id,
    catalogId: catalogRecord.id,
    gameListId: gameListRecord?.id ?? null,
    slug: "",
    name,
    platform: readText(glProps, "platforms") ?? readText(catProps, "platform") ?? readText(catProps, "category"),
    status: resolveStatus(catalogRecord, gameListRecord),
    metacritic: metacritic && metacritic > 0 ? Math.round(metacritic) : null,
    rating: glRating ?? fallbackRating,
    genres: readOptions(glProps, "genres"),
    franchises: readOptions(glProps, "franchises"),
    developers: readOptions(glProps, "developers"),
    publishers,
    labels: splitLabels(readText(glProps, "labels")),
    difficulty: readText(glProps, "difficulty"),
    releaseDate: readDate(glProps, "release_date"),
    addedOn: readDate(glProps, "added_on"),
    hltbHours: parseHours(readText(glProps, "hltb_main_story") ?? readNumber(glProps, "ttb_hours")),
    playtimeHours: playtimeMinutes && playtimeMinutes > 0 ? Math.round(playtimeMinutes / 6) / 10 : null,
    summary: summary && summary !== description ? summary : null,
    description,
    dlc: readText(glProps, "dlc"),
    notes: gameListRecord ? readText(glProps, "notes") : extractStandaloneNotes(catalogRecord.body),
    modes: readModes(glProps),
    maxPlayers: readMaxPlayers(glProps),
    cover: readHttpUrl(glProps, "cover_url"),
    brainUrl: `${webBase}/r/${id}`,
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

export const GAME_STATUSES = [
  "In progress",
  "Not started",
  "Want to Play",
  "Stalled",
  "Done",
  "Dropped",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export interface PlayModes {
  solo: boolean;
  localCoop: boolean;
  localVersus: boolean;
  onlineCoop: boolean;
  onlineVersus: boolean;
  lan: boolean;
}

export interface Game {
  /** Brain record UUID (Game List record id when linked, else catalog item id). */
  id: string;
  /** Linked catalog item UUID in `cortex/catalog` (`catalog: "games"`), when present. */
  catalogId?: string | null;
  /** Linked Game List record UUID in `imported/game-list`, when present. */
  gameListId?: string | null;
  /** URL-safe, unique within the library. */
  slug: string;
  name: string;
  /** Value of the `platforms` select, e.g. "Nintendo Switch". */
  platform: string | null;
  status: GameStatus;
  metacritic: number | null;
  /** Personal rating normalized to a 0–100 scale. */
  rating: number | null;
  genres: string[];
  franchises: string[];
  developers: string[];
  publishers: string[];
  labels: string[];
  difficulty: string | null;
  /** ISO date (YYYY-MM-DD). */
  releaseDate: string | null;
  /** ISO date (YYYY-MM-DD). */
  addedOn: string | null;
  /** HowLongToBeat main story, in hours. */
  hltbHours: number | null;
  playtimeHours: number | null;
  summary: string | null;
  description: string | null;
  dlc: string | null;
  notes: string | null;
  modes: PlayModes;
  /** Highest player count across all multiplayer modes, when known. */
  maxPlayers: number | null;
  /** Absolute image URL, or an `/api/cover/...` fallback path. */
  cover: string | null;
  /** Direct link to this record in the Brain cockpit. */
  brainUrl: string;
}

export interface Library {
  games: Game[];
  /** Where this data came from on this request. */
  source: "brain" | "snapshot";
  /** ISO timestamp of the last successful read from the Brain. */
  syncedAt: string;
}

import { cleanText } from "./text";
import { GAME_STATUSES, type Game, type GameStatus } from "./types";

/** What can be edited from the game view. Absent fields are left unchanged in the Brain. */
export interface Review {
  /** Brain record UUID (or 32-hex legacy id). */
  id: string;
  status?: GameStatus;
  /** Out of 20, in half points; `null` clears it. */
  rating?: number | null;
  /** Free-text feedback; `""` clears it. */
  notes?: string;
}

export type ParsedReview = { ok: true; review: Review } | { ok: false; error: string };

export type SaveReviewResult = { ok: true } | { ok: false; error: string };

export type CatalogStateName = "To review" | "Trying" | "In use" | "Rejected";

const MAX_NOTES = 10_000;
const RATING_ERROR = "The rating must be between 0.5 and 20, in half points.";
export const RECORD_ID_RE = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i;

/** The 0–100 `Game.rating` on the 20-point scale it is entered in. */
export function ratingOutOf20(rating: number | null): number | null {
  return rating == null ? null : Math.round((rating / 5) * 10) / 10;
}

/** Validates untrusted input from the client. */
export function parseReview(input: Record<string, unknown>): ParsedReview {
  const { id, status, rating, notes } = input;
  if (typeof id !== "string" || !RECORD_ID_RE.test(id)) return { ok: false, error: "Unknown game." };
  const review: Review = { id };

  if (status !== undefined) {
    const match = GAME_STATUSES.find((value) => value === status);
    if (!match) return { ok: false, error: "Unknown status." };
    review.status = match;
  }

  if (rating !== undefined) {
    const valid =
      rating === null ||
      (typeof rating === "number" && rating >= 0.5 && rating <= 20 && Number.isInteger(rating * 2));
    if (!valid) return { ok: false, error: RATING_ERROR };
    review.rating = rating;
  }

  if (notes !== undefined) {
    if (typeof notes !== "string") return { ok: false, error: "Unknown feedback." };
    if (notes.length > MAX_NOTES) return { ok: false, error: "Feedback is limited to 10,000 characters." };
    review.notes = cleanText(notes) ?? "";
  }

  if (Object.keys(review).length === 1) return { ok: false, error: "Nothing to save." };
  return { ok: true, review };
}

/** Maps a Game List status to the Brain `games` catalog `state` (see `catalog-games` recipe). */
export function statusToCatalogState(status: GameStatus): CatalogStateName {
  switch (status) {
    case "In progress":
    case "Stalled":
      return "Trying";
    case "Done":
      return "In use";
    case "Dropped":
      return "Rejected";
    case "Not started":
    case "Want to Play":
      return "To review";
  }
}

/** Maps a Brain catalog `state` back to a default Game List status when no Game List status exists. */
export function catalogStateToStatus(state: string | null | undefined): GameStatus {
  switch ((state ?? "").trim().toLowerCase()) {
    case "trying":
      return "In progress";
    case "in use":
    case "in_use":
      return "Done";
    case "rejected":
      return "Dropped";
    case "to review":
    case "to_review":
    default:
      return "Want to Play";
  }
}

/** Property patch for the `imported/game-list` record in `brain-api`. */
export function toGameListProps(review: Review): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (review.status) props.status = review.status;
  if (review.rating !== undefined) props.user_rating = review.rating;
  if (review.notes !== undefined) props.notes = review.notes;
  return props;
}

/** Property patch for the linked `cortex/catalog` item in `brain-api`. */
export function toCatalogProps(
  review: Review,
  options: { standalone?: boolean; today?: string } = {},
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  if (review.status) {
    props.state = statusToCatalogState(review.status);
    props.reviewed = { start: today };
  }
  if (options.standalone && review.rating !== undefined) {
    // Catalog items use a 1–5 rating scale when standalone.
    props.rating = review.rating === null ? null : Math.max(1, Math.min(5, Math.round(review.rating / 4)));
  }
  return props;
}

/** Applies a saved review onto an in-memory `Game` without losing unrelated fields. */
export function applyReviewToGame(game: Game, review: Review): Game {
  return {
    ...game,
    ...(review.status !== undefined ? { status: review.status } : {}),
    ...(review.rating !== undefined ? { rating: review.rating === null ? null : Math.round(review.rating * 5) } : {}),
    ...(review.notes !== undefined ? { notes: review.notes || null } : {}),
  };
}

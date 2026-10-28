import { cleanText } from "./text";
import { GAME_STATUSES, type GameStatus } from "./types";

/** What can be edited from the game view. Absent fields are left as they are in Notion. */
export interface Review {
  /** Notion page id without dashes. */
  id: string;
  status?: GameStatus;
  /** Out of 20, in half points; `null` clears it. */
  rating?: number | null;
  /** Free-text feedback; `""` clears it. */
  notes?: string;
}

export type ParsedReview = { ok: true; review: Review } | { ok: false; error: string };

export type SaveReviewResult = { ok: true } | { ok: false; error: string };

const MAX_NOTES = 10_000;
/** Notion caps each rich text object at 2,000 characters. */
const RICH_TEXT_CHUNK = 2_000;
const RATING_ERROR = "The rating must be between 0.5 and 20, in half points.";

/** The 0–100 `Game.rating` on the 20-point scale it is entered in. */
export function ratingOutOf20(rating: number | null): number | null {
  return rating == null ? null : Math.round((rating / 5) * 10) / 10;
}

/** Validates untrusted input from the client. */
export function parseReview(input: Record<string, unknown>): ParsedReview {
  const { id, status, rating, notes } = input;
  if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id)) return { ok: false, error: "Unknown game." };
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

/** The `pages.update` properties for a review, using the Game List property names. */
export function toNotionProperties(review: Review) {
  const properties: Record<string, unknown> = {};
  if (review.status) properties.status = { status: { name: review.status } };
  if (review.rating !== undefined) properties.user_rating = { number: review.rating };
  if (review.notes !== undefined) {
    const chunks = review.notes.match(new RegExp(`[\\s\\S]{1,${RICH_TEXT_CHUNK}}`, "g")) ?? [];
    properties.notes = { rich_text: chunks.map((content) => ({ type: "text", text: { content } })) };
  }
  return properties;
}

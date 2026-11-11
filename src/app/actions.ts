"use server";

import { updateTag } from "next/cache";
import { LIBRARY_TAG } from "@/lib/library";
import type { Review, SaveReviewResult } from "@/lib/review";
import { persistReview } from "@/lib/save-review";

/**
 * Writes a game's status, rating out of 20 and feedback back to the Brain
 * (`imported/game-list` and the linked `cortex/catalog` item), then expires
 * the cached library so the page reflects the change immediately.
 */
export async function saveReview(input: Review, password?: string): Promise<SaveReviewResult> {
  return persistReview(input, password, () => updateTag(LIBRARY_TAG));
}

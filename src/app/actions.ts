"use server";

import { updateTag } from "next/cache";
import { getBrainConfig, syncReviewToBrain } from "@/lib/brain";
import { getEditMode, passwordMatches } from "@/lib/edit-access";
import { getLibrary, LIBRARY_TAG } from "@/lib/library";
import { parseReview, type Review, type SaveReviewResult } from "@/lib/review";

/**
 * Writes a game's status, rating out of 20 and feedback back to the Brain
 * (`imported/game-list` and the linked `cortex/catalog` item), then expires
 * the cached library so the page reflects the change immediately.
 */
export async function saveReview(input: Review, password?: string): Promise<SaveReviewResult> {
  const mode = getEditMode();
  const config = getBrainConfig();
  if (mode === "off" || !config) return { ok: false, error: "Editing is turned off on this site." };
  if (mode === "password" && !passwordMatches(password, process.env.EDIT_PASSWORD!)) {
    return { ok: false, error: "Wrong password." };
  }

  // The type is only what the client promises: anyone can POST to an action.
  const parsed = parseReview({ ...input });
  if (!parsed.ok) return parsed;
  const { review } = parsed;

  // Only games in the Brain library can be edited.
  const { games } = await getLibrary();
  const game = games.find((entry) => entry.id === review.id);
  if (!game) return { ok: false, error: "Unknown game." };

  try {
    await syncReviewToBrain(config, game, review);
  } catch (error) {
    console.error("[review] Saving to Brain failed.", error);
    const reason = error instanceof Error ? ` ${error.message}` : "";
    return { ok: false, error: `Brain did not save the change.${reason}` };
  }

  updateTag(LIBRARY_TAG);
  return { ok: true };
}

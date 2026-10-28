"use server";

import { APIResponseError, type UpdatePageParameters } from "@notionhq/client";
import { updateTag } from "next/cache";
import { getEditMode, passwordMatches } from "@/lib/edit-access";
import { getLibrary, LIBRARY_TAG } from "@/lib/library";
import { createNotionClient, getNotionConfig } from "@/lib/notion";
import { parseReview, toNotionProperties, type Review, type SaveReviewResult } from "@/lib/review";

/**
 * Writes a game's status, rating out of 20 and feedback back to its Notion
 * page, then expires the cached library so the page shows the change.
 */
export async function saveReview(input: Review, password?: string): Promise<SaveReviewResult> {
  const mode = getEditMode();
  const config = getNotionConfig();
  if (mode === "off" || !config) return { ok: false, error: "Editing is turned off on this site." };
  if (mode === "password" && !passwordMatches(password, process.env.EDIT_PASSWORD!)) {
    return { ok: false, error: "Wrong password." };
  }

  // The type is only what the client promises: anyone can POST to an action.
  const parsed = parseReview({ ...input });
  if (!parsed.ok) return parsed;
  const { review } = parsed;

  // Only pages of the Game List can be edited, whatever else the integration can reach.
  const { games } = await getLibrary();
  if (!games.some((game) => game.id === review.id)) return { ok: false, error: "Unknown game." };

  try {
    await createNotionClient(config.token).pages.update({
      page_id: review.id,
      properties: toNotionProperties(review) as UpdatePageParameters["properties"],
    });
  } catch (error) {
    console.error("[review] Saving to Notion failed.", error);
    const reason = error instanceof APIResponseError ? ` ${error.message}` : "";
    return { ok: false, error: `Notion did not save the change.${reason}` };
  }

  updateTag(LIBRARY_TAG);
  return { ok: true };
}

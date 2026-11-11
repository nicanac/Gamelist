import { getBrainConfig, syncReviewToBrain } from "./brain";
import { getEditMode, passwordMatches } from "./edit-access";
import { getLibrary } from "./library";
import { parseReview, type Review, type SaveReviewResult } from "./review";

/**
 * Validates and writes a review back to the Brain (`imported/game-list` and
 * linked `cortex/catalog`), invoking `onSaved` once persisted.
 */
export async function persistReview(
  input: Review,
  password?: string,
  onSaved?: () => void,
): Promise<SaveReviewResult> {
  const mode = getEditMode();
  const config = getBrainConfig();
  if (mode === "off" || !config) return { ok: false, error: "Editing is turned off on this site." };
  if (mode === "password" && !passwordMatches(password, process.env.EDIT_PASSWORD!)) {
    return { ok: false, error: "Wrong password." };
  }

  const parsed = parseReview({ ...input });
  if (!parsed.ok) return parsed;
  const { review } = parsed;

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

  onSaved?.();
  return { ok: true };
}

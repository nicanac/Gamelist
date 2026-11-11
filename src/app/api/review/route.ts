import { revalidateTag } from "next/cache";
import { LIBRARY_TAG } from "@/lib/library";
import type { Review } from "@/lib/review";
import { persistReview } from "@/lib/save-review";

/**
 * Persists a review to Brain and expires the cached library without triggering
 * an App Router navigation that would wipe shallow `?game=<slug>` modal state.
 */
export async function POST(request: Request) {
  let body: { review?: Review; password?: string };
  try {
    body = (await request.json()) as { review?: Review; password?: string };
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body?.review || typeof body.review !== "object") {
    return Response.json({ ok: false, error: "Missing review payload." }, { status: 400 });
  }

  const result = await persistReview(body.review, body.password, () => {
    revalidateTag(LIBRARY_TAG, { expire: 0 });
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}

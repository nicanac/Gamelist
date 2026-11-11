import { revalidateTag } from "next/cache";
import { LIBRARY_TAG } from "@/lib/library";

/**
 * Refreshes the cached library on demand when called with
 * `Authorization: Bearer <REVALIDATE_SECRET>`.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (secret && bearer === secret) {
    revalidateTag(LIBRARY_TAG, "max");
    return Response.json({ ok: true, revalidated: LIBRARY_TAG, via: "secret" });
  }

  return Response.json({ ok: false }, { status: 401 });
}

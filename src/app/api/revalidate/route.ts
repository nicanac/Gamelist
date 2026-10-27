import { revalidateTag } from "next/cache";
import { verifyWebhookSignature } from "@notionhq/client";
import { LIBRARY_TAG } from "@/lib/library";

/**
 * Refreshes the cached library. Accepts either
 * - `Authorization: Bearer <REVALIDATE_SECRET>` (Notion "Send webhook"
 *   automations, cron jobs, curl), or
 * - a signed Notion integration webhook (`NOTION_WEBHOOK_VERIFICATION_TOKEN`).
 */
export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.REVALIDATE_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (secret && bearer === secret) return refreshed("secret");

  const verificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
  const signature = request.headers.get("x-notion-signature");
  if (verificationToken && signature) {
    const valid = await verifyWebhookSignature({ body, signature, verificationToken });
    return valid ? refreshed("notion-webhook") : unauthorized();
  }

  // Notion's one-time subscription handshake: surface the token so it can be
  // pasted back into Notion and saved as NOTION_WEBHOOK_VERIFICATION_TOKEN.
  if (!verificationToken) {
    const token = parseVerificationToken(body);
    if (token) {
      console.info(`[revalidate] Notion webhook verification token: ${token}`);
      return Response.json({ ok: true, handshake: true });
    }
  }

  return unauthorized();
}

function refreshed(via: string) {
  revalidateTag(LIBRARY_TAG, "max");
  return Response.json({ ok: true, revalidated: LIBRARY_TAG, via });
}

function unauthorized() {
  return Response.json({ ok: false }, { status: 401 });
}

function parseVerificationToken(body: string): string | null {
  try {
    const data = JSON.parse(body) as { verification_token?: unknown };
    return typeof data.verification_token === "string" ? data.verification_token : null;
  } catch {
    return null;
  }
}

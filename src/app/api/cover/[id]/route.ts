import type { NextRequest } from "next/server";
import { igdbFromEnv, resolveCover } from "@/lib/covers";
import { fetchNotionCoverUrl } from "@/lib/notion";

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

/**
 * Redirects to a game's cover art. `?notion=1` re-signs a Notion-hosted page
 * cover (those URLs expire after an hour); otherwise the cover is looked up
 * by `name`, `platform` and `year`. A 404 lets the client keep its generated
 * artwork. Responses carry CDN cache headers so each game is resolved rarely.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/cover/[id]">) {
  const { id } = await context.params;
  const params = request.nextUrl.searchParams;
  if (!/^[0-9a-f]{32}$/i.test(id)) return notFound(DAY);

  if (params.get("notion") === "1") {
    const token = process.env.NOTION_TOKEN;
    if (!token) return notFound(HOUR);
    try {
      const url = await fetchNotionCoverUrl(token, id);
      return url ? redirectTo(url, 30 * 60) : notFound(HOUR);
    } catch {
      return notFound(5 * 60);
    }
  }

  const name = params.get("name")?.trim();
  if (!name || name.length > 200) return notFound(DAY);
  const lookup = await resolveCover(
    { name, platform: params.get("platform"), year: Number(params.get("year")) || null },
    { igdb: igdbFromEnv(), userAgent: process.env.COVER_USER_AGENT },
  );
  if (lookup.url) return redirectTo(lookup.url, lookup.degraded ? HOUR : 30 * DAY);
  return notFound(lookup.degraded ? 5 * 60 : 7 * DAY);
}

function cacheControl(seconds: number) {
  return `public, max-age=${Math.min(seconds, DAY)}, s-maxage=${seconds}, stale-while-revalidate=${DAY}`;
}

function redirectTo(url: string, seconds: number) {
  return new Response(null, { status: 307, headers: { Location: url, "Cache-Control": cacheControl(seconds) } });
}

function notFound(seconds: number) {
  return new Response(null, { status: 404, headers: { "Cache-Control": cacheControl(seconds) } });
}

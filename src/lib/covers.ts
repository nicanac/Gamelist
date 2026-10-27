import { titleSimilarity } from "./text";

/** `fetch` plus Next.js' caching extension (ignored outside Next). */
export type Fetcher = (
  input: string,
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } },
) => Promise<Response>;

export interface CoverQuery {
  name: string;
  platform?: string | null;
  year?: number | null;
}

export interface IgdbCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CoverOptions {
  fetch?: Fetcher;
  igdb?: IgdbCredentials | null;
  userAgent?: string;
}

export interface CoverLookup {
  url: string | null;
  source: "igdb" | "wikipedia" | null;
  /** A source failed transiently (rate limit, network); cache this answer briefly. */
  degraded: boolean;
}

const MONTH = 60 * 60 * 24 * 30;
const TIMEOUT_MS = 8000;
const MIN_SIMILARITY = 0.6;
const DEFAULT_USER_AGENT = "GameLibrary/1.0 (+https://github.com/nicanac/Gamelist)";

class TransientError extends Error {}

export function igdbFromEnv(env: NodeJS.ProcessEnv = process.env): IgdbCredentials | null {
  const clientId = env.IGDB_CLIENT_ID?.trim();
  const clientSecret = env.IGDB_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Tries IGDB (when configured), then Wikipedia. Never throws. */
export async function resolveCover(query: CoverQuery, options: CoverOptions = {}): Promise<CoverLookup> {
  const fetcher = options.fetch ?? (fetch as Fetcher);
  let degraded = false;

  if (options.igdb) {
    try {
      const url = await findIgdbCover(query, options.igdb, fetcher);
      if (url) return { url, source: "igdb", degraded: false };
    } catch {
      degraded = true;
    }
  }

  try {
    const url = await findWikipediaCover(query, fetcher, options.userAgent ?? DEFAULT_USER_AGENT);
    if (url) return { url, source: "wikipedia", degraded };
  } catch {
    degraded = true;
  }

  return { url: null, source: null, degraded };
}

function bareTitle(name: string): string {
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 429 || response.status >= 500) {
    throw new TransientError(`Upstream answered ${response.status}`);
  }
  if (!response.ok) throw new Error(`Upstream answered ${response.status}`);
  return (await response.json()) as T;
}

// ---------------------------------------------------------------- Wikipedia

export interface WikipediaPage {
  title: string;
  index?: number;
  missing?: boolean;
  thumbnail?: { source: string; width: number; height: number };
  pageprops?: { disambiguation?: string };
}

export function wikipediaSearchUrl(term: string): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    generator: "search",
    gsrsearch: term,
    gsrlimit: "6",
    gsrnamespace: "0",
    prop: "pageimages|pageprops",
    piprop: "thumbnail|name",
    pithumbsize: "600",
    // Box art is non-free content; the API only returns free images by default.
    pilicense: "any",
    ppprop: "disambiguation",
  });
  return `https://en.wikipedia.org/w/api.php?${params}`;
}

const NOT_A_GAME = /\b(franchise|series|character|film|soundtrack|album|novel|tv series|manga|anime|comics?)\b/i;

/** Picks the search hit that is most likely this game's article, if any. */
export function pickWikipediaCover(pages: WikipediaPage[], query: CoverQuery): string | null {
  let best: { url: string; score: number } | null = null;
  for (const page of pages) {
    if (page.missing || !page.thumbnail?.source) continue;
    if (page.pageprops && "disambiguation" in page.pageprops) continue;
    const qualifier = page.title.match(/\(([^)]*)\)\s*$/)?.[1] ?? "";
    if (NOT_A_GAME.test(qualifier)) continue;
    const similarity = titleSimilarity(query.name, bareTitle(page.title));
    if (similarity < MIN_SIMILARITY) continue;
    let score = similarity - (page.index ?? 1) * 0.01;
    if (/video game/i.test(qualifier)) score += 0.1;
    if (query.year && qualifier.includes(String(query.year))) score += 0.2;
    if (!best || score > best.score) best = { url: page.thumbnail.source, score };
  }
  return best?.url ?? null;
}

async function findWikipediaCover(query: CoverQuery, fetcher: Fetcher, userAgent: string) {
  const name = bareTitle(query.name);
  for (const term of [`${name} video game`, name]) {
    const response = await fetcher(wikipediaSearchUrl(term), {
      headers: { "User-Agent": userAgent, "Api-User-Agent": userAgent },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "force-cache",
      next: { revalidate: MONTH },
    });
    const data = await readJson<{ query?: { pages?: WikipediaPage[] } }>(response);
    const url = pickWikipediaCover(data.query?.pages ?? [], query);
    if (url) return url;
  }
  return null;
}

// --------------------------------------------------------------------- IGDB

export interface IgdbGame {
  name: string;
  cover?: { image_id?: string };
  platforms?: { name: string }[];
  first_release_date?: number;
}

export function igdbCoverUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`;
}

export function pickIgdbCover(games: IgdbGame[], query: CoverQuery): string | null {
  let best: { url: string; score: number } | null = null;
  for (const game of games) {
    const imageId = game.cover?.image_id;
    if (!imageId) continue;
    const similarity = titleSimilarity(query.name, game.name);
    if (similarity < MIN_SIMILARITY) continue;
    let score = similarity;
    if (query.platform && game.platforms?.some((platform) => platform.name === query.platform)) score += 0.2;
    if (query.year && game.first_release_date) {
      const year = new Date(game.first_release_date * 1000).getUTCFullYear();
      if (year === query.year) score += 0.1;
    }
    if (!best || score > best.score) best = { url: igdbCoverUrl(imageId), score };
  }
  return best?.url ?? null;
}

let igdbToken: { value: string; expiresAt: number } | null = null;

async function getIgdbToken(credentials: IgdbCredentials, fetcher: Fetcher, fresh = false) {
  if (!fresh && igdbToken && igdbToken.expiresAt > Date.now()) return igdbToken.value;
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "client_credentials",
  });
  const response = await fetcher(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const data = await readJson<{ access_token: string; expires_in: number }>(response);
  igdbToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 3600) * 1000 };
  return igdbToken.value;
}

// IGDB allows 4 requests per second; keep a little headroom per instance.
const igdbQueue = createLimiter(3);

async function findIgdbCover(query: CoverQuery, credentials: IgdbCredentials, fetcher: Fetcher) {
  const search = bareTitle(query.name).replace(/["\\]/g, " ");
  const body = `search "${search}"; fields name,cover.image_id,platforms.name,first_release_date; where cover != null; limit 10;`;
  const request = async (token: string) =>
    igdbQueue(() =>
      fetcher("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: { "Client-ID": credentials.clientId, Authorization: `Bearer ${token}`, Accept: "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "force-cache",
        next: { revalidate: MONTH },
      }),
    );
  let response = await request(await getIgdbToken(credentials, fetcher));
  if (response.status === 401) response = await request(await getIgdbToken(credentials, fetcher, true));
  return pickIgdbCover(await readJson<IgdbGame[]>(response), query);
}

/** Minimal promise limiter: at most `concurrency` tasks in flight. */
export function createLimiter(concurrency: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    else active += 1;
    try {
      return await task();
    } finally {
      // Hand the slot straight to the next waiter so no newcomer can jump in.
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    }
  };
}

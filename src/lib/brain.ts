import { randomUUID } from "node:crypto";
import { assignSlugs, normalizeBrainGame, sortByName, type BrainRecordLike } from "./normalize";
import { toCatalogProps, toGameListProps, type Review } from "./review";
import type { Game } from "./types";

const DEFAULT_API_URL = "https://api-brain.nicode.eu";
const DEFAULT_WEB_URL = "https://brain.nicode.eu";
const CATALOG_SPACE = "cortex";
const CATALOG_SLUG = "catalog";
const GAME_LIST_SPACE = "imported";
const GAME_LIST_SLUG = "imported-47324caa97844e448dc39e76f414799f";
const PAGE_LIMIT = 200;
const MAX_PAGES = 20;
const REQUEST_TIMEOUT_MS = 15_000;

export interface BrainConfig {
  apiUrl: string;
  webUrl: string;
  token: string;
  catalogSlug: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface CollectionOption {
  id: string;
  name: string;
}

interface CollectionProperty {
  key: string;
  type: string;
  config?: { options?: CollectionOption[] } | null;
}

interface CollectionMeta {
  id: string;
  optionsByProp: Map<string, Map<string, string>>;
}

interface QueryResponse {
  records?: BrainRecordLike[];
  has_more?: boolean;
  next_cursor?: string | null;
}

let latestCommit: string | undefined;

export function getLatestCommit(): string | undefined {
  return latestCommit;
}

export function clearLatestCommit(): void {
  latestCommit = undefined;
}

/** Reads Brain API settings from the environment; `null` means "use the snapshot". */
export function getBrainConfig(env: NodeJS.ProcessEnv = process.env): BrainConfig | null {
  const token = env.BRAIN_TOKEN?.trim() || env.BRAIN_API_TOKEN?.trim();
  if (!token) return null;
  const apiUrl = (env.BRAIN_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, "");
  const webUrl = (env.BRAIN_WEB_URL?.trim() || DEFAULT_WEB_URL).replace(/\/+$/, "");
  const catalogSlug = env.BRAIN_GAMES_CATALOG?.trim() || "games";
  return { apiUrl, webUrl, token, catalogSlug };
}

function authHeaders(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...extra,
  };
}

async function brainJson<T>(
  url: string,
  token: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<{ status: number; headers: Headers; data: T }> {
  const response = await fetchImpl(url, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      ...authHeaders(token),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (!response.ok) {
    const err = data as { code?: string; detail?: string; title?: string } | null;
    const message = err?.detail || err?.title || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Brain API ${response.status}: ${message}`), {
      status: response.status,
      code: err?.code,
      payload: data,
    });
  }
  return { status: response.status, headers: response.headers, data: data as T };
}

export async function fetchCollectionMeta(
  config: BrainConfig,
  space: string,
  slug: string,
  fetchImpl: FetchLike = fetch,
): Promise<CollectionMeta> {
  const { data } = await brainJson<{ id: string; properties?: CollectionProperty[] }>(
    `${config.apiUrl}/v1/collections/by-path/${encodeURIComponent(space)}/${encodeURIComponent(slug)}`,
    config.token,
    { method: "GET" },
    fetchImpl,
  );
  const optionsByProp = new Map<string, Map<string, string>>();
  for (const prop of data.properties ?? []) {
    const opts = prop.config?.options;
    if (!opts?.length) continue;
    optionsByProp.set(prop.key, new Map(opts.map((opt) => [opt.id, opt.name])));
  }
  return { id: data.id, optionsByProp };
}

export function resolveRecordOptions(
  record: BrainRecordLike,
  optionsByProp: Map<string, Map<string, string>>,
): BrainRecordLike {
  if (!record.props || optionsByProp.size === 0) return record;
  let nextProps: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(record.props)) {
    const map = optionsByProp.get(key);
    if (!map) continue;
    const resolve = (item: unknown) => (typeof item === "string" ? (map.get(item) ?? item) : item);
    const resolved = Array.isArray(value) ? value.map(resolve) : resolve(value);
    if (resolved !== value && JSON.stringify(resolved) !== JSON.stringify(value)) {
      nextProps ??= { ...record.props };
      nextProps[key] = resolved;
    }
  }
  return nextProps ? { ...record, props: nextProps } : record;
}

export async function queryAllRecords(
  config: BrainConfig,
  meta: CollectionMeta,
  filter?: Record<string, unknown>,
  minCommit?: string,
  fetchImpl: FetchLike = fetch,
): Promise<BrainRecordLike[]> {
  const records: BrainRecordLike[] = [];
  let cursor: string | undefined;
  let commitHeader = minCommit;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = JSON.stringify({
      ...(filter ? { filter } : {}),
      limit: PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    const run = (commit?: string) =>
      brainJson<QueryResponse>(
        `${config.apiUrl}/v1/collections/${meta.id}/query`,
        config.token,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(commit ? { "X-Min-Commit": commit } : {}),
          },
          body: payload,
        },
        fetchImpl,
      );

    let result: { status: number; headers: Headers; data: QueryResponse };
    try {
      result = await run(commitHeader);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (commitHeader && status === 503) {
        commitHeader = undefined;
        result = await run(undefined);
      } else {
        throw error;
      }
    }

    for (const rec of result.data.records ?? []) {
      records.push(resolveRecordOptions(rec, meta.optionsByProp));
    }
    if (!result.data.has_more || !result.data.next_cursor) break;
    cursor = result.data.next_cursor;
  }

  return records;
}

/**
 * Loads the `games` catalog from the Brain (`cortex/catalog`) and joins each
 * item with its full `imported/game-list` record (`props.key`).
 */
export async function fetchGamesFromBrain(
  config: BrainConfig,
  minCommit = latestCommit,
  fetchImpl: FetchLike = fetch,
): Promise<Game[]> {
  const [catalogMeta, gameListMeta] = await Promise.all([
    fetchCollectionMeta(config, CATALOG_SPACE, CATALOG_SLUG, fetchImpl),
    fetchCollectionMeta(config, GAME_LIST_SPACE, GAME_LIST_SLUG, fetchImpl),
  ]);

  const [catalogRecords, gameListRecords] = await Promise.all([
    queryAllRecords(
      config,
      catalogMeta,
      { prop: "catalog", op: "eq", value: config.catalogSlug },
      minCommit,
      fetchImpl,
    ),
    queryAllRecords(config, gameListMeta, undefined, minCommit, fetchImpl),
  ]);

  const gameListById = new Map(gameListRecords.map((record) => [record.id, record]));
  const games: Game[] = [];

  for (const catalogItem of catalogRecords) {
    if (catalogItem.props?.delisted === true) continue;
    const key = typeof catalogItem.props?.key === "string" ? catalogItem.props.key.trim() : "";
    const linked = key ? gameListById.get(key) : undefined;
    games.push(normalizeBrainGame(catalogItem, linked, config.webUrl));
  }

  return sortByName(assignSlugs(games));
}

async function readRecordTag(
  config: BrainConfig,
  recordId: string,
  fetchImpl: FetchLike,
): Promise<string | undefined> {
  const { headers, data } = await brainJson<{ record?: { version?: number }; version?: number }>(
    `${config.apiUrl}/v1/records/${recordId}`,
    config.token,
    { method: "GET" },
    fetchImpl,
  );
  const etag = headers.get("etag")?.replace(/^"|"$/g, "");
  if (etag) return etag;
  const version = data.record?.version ?? data.version;
  return typeof version === "number" ? `v${version}` : undefined;
}

export async function patchBrainRecord(
  config: BrainConfig,
  recordId: string,
  update: { props?: Record<string, unknown>; body?: string },
  fetchImpl: FetchLike = fetch,
): Promise<string | undefined> {
  const payload = JSON.stringify(update);
  const send = (ifMatch?: string) =>
    brainJson<{ commit?: string }>(
      `${config.apiUrl}/v1/records/${recordId}`,
      config.token,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
          ...(ifMatch ? { "If-Match": ifMatch } : {}),
        },
        body: payload,
      },
      fetchImpl,
    );

  const initialTag = await readRecordTag(config, recordId, fetchImpl);
  let res: { status: number; headers: Headers; data: { commit?: string } };
  try {
    res = await send(initialTag);
  } catch (error) {
    const err = error as { status?: number; payload?: { current_etag?: string; current_version?: number } };
    if (err.status !== 412) throw error;
    const retryTag =
      err.payload?.current_etag ??
      (typeof err.payload?.current_version === "number"
        ? `v${err.payload.current_version}`
        : await readRecordTag(config, recordId, fetchImpl));
    res = await send(retryTag);
  }

  const commit = res.headers.get("x-commit") || res.data?.commit;
  if (commit) latestCommit = commit;
  return commit;
}

/**
 * Persists changes from Gamelist back to the Brain:
 * 1. Updates the Game List record (`status`, `user_rating`, `notes`) when linked.
 * 2. Keeps the linked `cortex/catalog` item (`state`, `reviewed`) in sync too
 *    (and updates `rating` / `body` when the item has no Game List record).
 */
export async function syncReviewToBrain(
  config: BrainConfig,
  game: Pick<Game, "id" | "catalogId" | "gameListId">,
  review: Review,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const gameListId = game.gameListId === undefined ? game.id : game.gameListId;

  // Apply sequentially so the git-first writer commits one update on top of the other cleanly.
  if (gameListId) {
    const props = toGameListProps(review);
    if (Object.keys(props).length > 0) {
      await patchBrainRecord(config, gameListId, { props }, fetchImpl);
    }
  }

  if (game.catalogId) {
    const standalone = !gameListId;
    const catProps = toCatalogProps(review, { standalone });
    const body =
      standalone && review.notes !== undefined ? (review.notes ? `## Review\n\n${review.notes}` : "") : undefined;
    if (Object.keys(catProps).length > 0 || body !== undefined) {
      await patchBrainRecord(
        config,
        game.catalogId,
        {
          ...(Object.keys(catProps).length > 0 ? { props: catProps } : {}),
          ...(body !== undefined ? { body } : {}),
        },
        fetchImpl,
      );
    }
  }
}

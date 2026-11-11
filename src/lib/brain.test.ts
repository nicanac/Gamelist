import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLatestCommit,
  fetchGamesFromBrain,
  getBrainConfig,
  getLatestCommit,
  syncReviewToBrain,
  type FetchLike,
} from "./brain";

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

describe("getBrainConfig", () => {
  it("returns null without a token and applies defaults otherwise", () => {
    expect(getBrainConfig(env({}))).toBeNull();
    expect(getBrainConfig(env({ BRAIN_TOKEN: " brn_123 " }))).toEqual({
      apiUrl: "https://api-brain.nicode.eu",
      webUrl: "https://brain.nicode.eu",
      token: "brn_123",
      catalogSlug: "games",
    });
    expect(
      getBrainConfig(
        env({
          BRAIN_API_TOKEN: "brn_alt",
          BRAIN_API_URL: "https://api.example.com/",
          BRAIN_WEB_URL: "https://web.example.com/",
          BRAIN_GAMES_CATALOG: "custom-games",
        }),
      ),
    ).toEqual({
      apiUrl: "https://api.example.com",
      webUrl: "https://web.example.com",
      token: "brn_alt",
      catalogSlug: "custom-games",
    });
  });
});

describe("fetchGamesFromBrain", () => {
  it("joins catalog games with Game List records, resolves option IDs, skips delisted, and paginates", async () => {
    const fetchMock = vi.fn<FetchLike>(async (url, init) => {
      if (url.endsWith("/v1/collections/by-path/cortex/catalog")) {
        return jsonResponse({
          id: "coll-cat",
          properties: [
            {
              key: "state",
              type: "select",
              config: { options: [{ id: "to_review", name: "To review" }, { id: "trying", name: "Trying" }] },
            },
          ],
        });
      }
      if (url.endsWith("/v1/collections/by-path/imported/imported-47324caa97844e448dc39e76f414799f")) {
        return jsonResponse({
          id: "coll-gl",
          properties: [
            { key: "status", type: "status", config: { options: [{ id: "opt_wp", name: "Want to Play" }] } },
            { key: "platforms", type: "select", config: { options: [{ id: "opt_sw", name: "Nintendo Switch" }] } },
            { key: "genres", type: "multi_select", config: { options: [{ id: "opt_adv", name: "Adventure" }] } },
          ],
        });
      }
      if (url.endsWith("/v1/collections/coll-cat/query")) {
        return jsonResponse({
          records: [
            {
              id: "cat-1",
              title: "Zelda: Breath of the Wild",
              props: {
                catalog: "games",
                key: "gl-1",
                category: "Nintendo Switch",
                state: "to_review",
                score: 97,
              },
            },
            {
              id: "cat-delisted",
              title: "Gone Game",
              props: { catalog: "games", key: "gl-gone", delisted: true },
            },
            {
              id: "cat-standalone",
              title: "Hades II",
              props: { catalog: "games", key: "hades-ii", category: "PC & Xbox", state: "trying", score: 94 },
            },
          ],
          has_more: false,
        });
      }
      if (url.endsWith("/v1/collections/coll-gl/query")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { cursor?: string };
        if (!body.cursor) {
          return jsonResponse({
            records: [
              {
                id: "gl-1",
                title: "Breath of the Wild",
                props: {
                  platforms: "opt_sw",
                  status: "opt_wp",
                  genres: ["opt_adv"],
                  mc_score: 97,
                  cover_url: "https://images.igdb.com/botw.jpg",
                },
              },
            ],
            has_more: true,
            next_cursor: "page-2",
          });
        }
        return jsonResponse({ records: [], has_more: false });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const games = await fetchGamesFromBrain(
      { apiUrl: "https://api.test", webUrl: "https://brain.test", token: "tok", catalogSlug: "games" },
      undefined,
      fetchMock,
    );

    expect(games).toHaveLength(2);
    expect(games[0]).toMatchObject({
      id: "gl-1",
      catalogId: "cat-1",
      gameListId: "gl-1",
      name: "Breath of the Wild",
      platform: "Nintendo Switch",
      status: "Want to Play",
      genres: ["Adventure"],
      cover: "https://images.igdb.com/botw.jpg",
      brainUrl: "https://brain.test/r/gl-1",
    });
    expect(games[1]).toMatchObject({
      id: "cat-standalone",
      catalogId: "cat-standalone",
      gameListId: null,
      name: "Hades II",
      status: "In progress",
      metacritic: 94,
    });
  });
});

describe("syncReviewToBrain", () => {
  beforeEach(() => clearLatestCommit());

  it("updates both the Game List record and the Catalog item, handling 412 ETag retries", async () => {
    const patchCalls: { url: string; ifMatch: string | null; body: unknown }[] = [];
    let glAttempts = 0;

    const fetchMock = vi.fn<FetchLike>(async (url, init) => {
      if (init?.method === "GET") {
        const tag = url.endsWith("/gl-1") ? '"blob-old"' : '"blob-cat"';
        return jsonResponse({ record: { id: "x", version: 1 } }, 200, { ETag: tag });
      }
      if (init?.method === "PATCH") {
        const ifMatch = (init.headers as Record<string, string>)["If-Match"] ?? null;
        const body = JSON.parse(String(init.body));
        patchCalls.push({ url, ifMatch, body });
        if (url.endsWith("/gl-1") && glAttempts === 0) {
          glAttempts += 1;
          return jsonResponse({ code: "version_conflict", current_etag: "blob-fresh" }, 412);
        }
        return jsonResponse({ commit: url.endsWith("/gl-1") ? "sha-1" : "sha-2" }, 202, {
          "X-Commit": url.endsWith("/gl-1") ? "sha-1" : "sha-2",
        });
      }
      throw new Error(`Unexpected call: ${init?.method} ${url}`);
    });

    await syncReviewToBrain(
      { apiUrl: "https://api.test", webUrl: "https://brain.test", token: "tok", catalogSlug: "games" },
      { id: "gl-1", gameListId: "gl-1", catalogId: "cat-1" },
      { id: "gl-1", status: "Done", rating: 19, notes: "Masterpiece." },
      fetchMock,
    );

    expect(patchCalls).toHaveLength(3);
    expect(patchCalls[0]).toMatchObject({ url: "https://api.test/v1/records/gl-1", ifMatch: '"blob-old"' });
    expect(patchCalls[1]).toMatchObject({
      url: "https://api.test/v1/records/gl-1",
      ifMatch: '"blob-fresh"',
      body: { props: { status: "Done", user_rating: 19, notes: "Masterpiece." } },
    });
    expect(patchCalls[2]).toMatchObject({
      url: "https://api.test/v1/records/cat-1",
      ifMatch: '"blob-cat"',
      body: { props: { state: "In use" } },
    });
    expect(getLatestCommit()).toBe("sha-2");
  });
});

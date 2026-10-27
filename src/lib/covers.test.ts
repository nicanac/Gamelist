import { describe, expect, it, vi } from "vitest";
import {
  createLimiter,
  igdbCoverUrl,
  pickIgdbCover,
  pickWikipediaCover,
  resolveCover,
  wikipediaSearchUrl,
  type Fetcher,
  type WikipediaPage,
} from "./covers";

const thumb = (source: string, width = 220, height = 310) => ({ source, width, height });

describe("wikipediaSearchUrl", () => {
  it("asks for non-free page images", () => {
    const url = new URL(wikipediaSearchUrl("Dead Cells video game"));
    expect(url.origin).toBe("https://en.wikipedia.org");
    expect(url.searchParams.get("gsrsearch")).toBe("Dead Cells video game");
    expect(url.searchParams.get("pilicense")).toBe("any");
    expect(url.searchParams.get("formatversion")).toBe("2");
  });
});

describe("pickWikipediaCover", () => {
  it("prefers the matching video game article over franchises and disambiguation pages", () => {
    const pages: WikipediaPage[] = [
      { title: "Doom (franchise)", index: 1, thumbnail: thumb("https://up.test/franchise.png") },
      { title: "Doom", index: 2, thumbnail: thumb("https://up.test/disambig.png"), pageprops: { disambiguation: "" } },
      { title: "Doom (2016 video game)", index: 3, thumbnail: thumb("https://up.test/2016.jpg") },
      { title: "Doom (1993 video game)", index: 4, thumbnail: thumb("https://up.test/1993.jpg") },
    ];
    expect(pickWikipediaCover(pages, { name: "Doom", year: 2016 })).toBe("https://up.test/2016.jpg");
    expect(pickWikipediaCover(pages, { name: "Doom", year: 1993 })).toBe("https://up.test/1993.jpg");
  });

  it("rejects unrelated titles and pages without an image", () => {
    const pages: WikipediaPage[] = [
      { title: "Tetris Effect", index: 1, thumbnail: thumb("https://up.test/effect.jpg") },
      { title: "Tetris 99", index: 2 },
    ];
    expect(pickWikipediaCover(pages, { name: "Puyo Puyo Tetris 2" })).toBeNull();
    expect(pickWikipediaCover(pages, { name: "Tetris 99" })).toBeNull();
  });

  it("matches across edition suffixes and qualifiers", () => {
    const pages: WikipediaPage[] = [{ title: "Arms (video game)", index: 1, thumbnail: thumb("https://up.test/arms.jpg") }];
    expect(pickWikipediaCover(pages, { name: "ARMS" })).toBe("https://up.test/arms.jpg");
    const ring: WikipediaPage[] = [{ title: "Elden Ring", index: 1, thumbnail: thumb("https://up.test/er.jpg") }];
    expect(pickWikipediaCover(ring, { name: "Elden Ring Collector's Edition" })).toBe("https://up.test/er.jpg");
  });
});

describe("pickIgdbCover", () => {
  it("boosts the entry released on the requested platform", () => {
    const url = pickIgdbCover(
      [
        { name: "Doom", cover: { image_id: "pc93" }, platforms: [{ name: "PC (Microsoft Windows)" }], first_release_date: 755_222_400 },
        { name: "Doom", cover: { image_id: "ps16" }, platforms: [{ name: "PlayStation 4" }], first_release_date: 1_463_097_600 },
      ],
      { name: "Doom", platform: "PlayStation 4" },
    );
    expect(url).toBe(igdbCoverUrl("ps16"));
  });

  it("skips results without art or with a different title", () => {
    expect(pickIgdbCover([{ name: "Doom" }, { name: "Quake", cover: { image_id: "q" } }], { name: "Doom" })).toBeNull();
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function wikiResponse(pages: WikipediaPage[]) {
  return json({ batchcomplete: true, query: { pages } });
}

describe("resolveCover", () => {
  it("uses IGDB first when configured", async () => {
    const fetcher = vi.fn<Fetcher>(async (input) => {
      if (input.startsWith("https://id.twitch.tv")) return json({ access_token: "token", expires_in: 5_000_000 });
      if (input === "https://api.igdb.com/v4/games") return json([{ name: "Dead Cells", cover: { image_id: "co1" } }]);
      throw new Error(`unexpected ${input}`);
    });
    const result = await resolveCover({ name: "Dead Cells" }, { fetch: fetcher, igdb: { clientId: "id", clientSecret: "s" } });
    expect(result).toEqual({ url: igdbCoverUrl("co1"), source: "igdb", degraded: false });
    const [, init] = fetcher.mock.calls.find(([input]) => input.includes("igdb.com"))!;
    expect(init?.headers).toMatchObject({ "Client-ID": "id", Authorization: "Bearer token" });
    expect(String(init?.body)).toContain('search "Dead Cells"');
  });

  it("falls back to Wikipedia and flags a rate-limited IGDB as degraded", async () => {
    const fetcher = vi.fn<Fetcher>(async (input) => {
      if (input.startsWith("https://id.twitch.tv")) return json({ access_token: "token", expires_in: 5_000_000 });
      if (input.includes("igdb.com")) return json({ message: "Too Many Requests" }, 429);
      return wikiResponse([{ title: "Hades (video game)", index: 1, thumbnail: thumb("https://up.test/hades.jpg") }]);
    });
    const result = await resolveCover({ name: "Hades" }, { fetch: fetcher, igdb: { clientId: "id", clientSecret: "s" } });
    expect(result).toEqual({ url: "https://up.test/hades.jpg", source: "wikipedia", degraded: true });
  });

  it("retries Wikipedia without the 'video game' hint, then gives up cleanly", async () => {
    const terms: string[] = [];
    const fetcher = vi.fn<Fetcher>(async (input) => {
      terms.push(new URL(input).searchParams.get("gsrsearch") ?? "");
      return wikiResponse([]);
    });
    const result = await resolveCover({ name: "Resident Evil Village (8)" }, { fetch: fetcher });
    expect(terms).toEqual(["Resident Evil Village video game", "Resident Evil Village"]);
    expect(result).toEqual({ url: null, source: null, degraded: false });
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ "User-Agent": expect.stringContaining("GameLibrary") });
  });

  it("reports network failures as degraded instead of throwing", async () => {
    const fetcher = vi.fn<Fetcher>(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(resolveCover({ name: "Hades" }, { fetch: fetcher })).resolves.toEqual({
      url: null,
      source: null,
      degraded: true,
    });
  });
});

describe("createLimiter", () => {
  it("never runs more than the allowed number of tasks at once", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      limit(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
      });
    await Promise.all(Array.from({ length: 8 }, task));
    expect(peak).toBe(2);
  });
});

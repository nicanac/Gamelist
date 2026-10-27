import type { Client } from "@notionhq/client";
import { describe, expect, it, vi } from "vitest";
import { fetchNotionPages, findPageImage, getNotionConfig } from "./notion";

const page = (id: string, name: string) => ({
  object: "page",
  id,
  url: `https://www.notion.so/${id}`,
  created_time: "2022-11-01T00:00:00.000Z",
  cover: null,
  properties: { name: { type: "title", title: [{ plain_text: name }] } },
});

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("getNotionConfig", () => {
  it("needs a token and a data source or database id", () => {
    expect(getNotionConfig(env({}))).toBeNull();
    expect(getNotionConfig(env({ NOTION_TOKEN: "secret" }))).toBeNull();
    expect(getNotionConfig(env({ NOTION_TOKEN: " secret ", NOTION_DATA_SOURCE_ID: "ds" }))).toEqual({
      token: "secret",
      dataSourceId: "ds",
      databaseId: undefined,
    });
  });
});

describe("fetchNotionPages", () => {
  it("follows pagination and keeps only full pages", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ results: [page("a", "Hades"), { object: "page", id: "partial" }], next_cursor: "next" })
      .mockResolvedValueOnce({ results: [page("b", "Celeste")], next_cursor: null });
    const client = { dataSources: { query } } as unknown as Client;

    const pages = await fetchNotionPages({ token: "t", dataSourceId: "ds" }, client);

    expect(pages.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toMatchObject({ data_source_id: "ds" });
    expect(query.mock.calls[1][0]).toMatchObject({ data_source_id: "ds", start_cursor: "next" });
  });

  it("resolves the data source from a database id", async () => {
    const retrieve = vi.fn().mockResolvedValue({ object: "database", data_sources: [{ id: "ds-from-db", name: "Game List" }] });
    const query = vi.fn().mockResolvedValue({ results: [page("a", "Hades")], next_cursor: null });
    const client = { databases: { retrieve }, dataSources: { query } } as unknown as Client;

    await fetchNotionPages({ token: "t", databaseId: "db" }, client);

    expect(retrieve).toHaveBeenCalledWith({ database_id: "db" });
    expect(query.mock.calls[0][0]).toMatchObject({ data_source_id: "ds-from-db" });
  });
});

describe("findPageImage", () => {
  const blocks = (results: unknown[]) =>
    ({ blocks: { children: { list: vi.fn().mockResolvedValue({ results }) } } }) as unknown as Client;

  it("returns the first external image block", async () => {
    const client = blocks([
      { object: "block", type: "heading_2", heading_2: { rich_text: [] } },
      { object: "block", type: "image", image: { type: "external", external: { url: "https://img.test/cover.jpg" } } },
    ]);
    await expect(findPageImage(client, "page")).resolves.toBe("https://img.test/cover.jpg");
  });

  it("accepts a paragraph that links straight to an image file", async () => {
    const url = "https://cdn.cloudflare.steamstatic.com/steam/apps/588650/library_600x900.jpg";
    const client = blocks([
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", href: url, plain_text: url, text: { content: url, link: { url } } }] },
      },
    ]);
    await expect(findPageImage(client, "page")).resolves.toBe(url);
  });

  it("ignores expiring Notion-hosted images and ordinary links", async () => {
    const client = blocks([
      { object: "block", type: "image", image: { type: "file", file: { url: "https://s3.test/signed.png" } } },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", href: "https://example.com/review", plain_text: "review" }] },
      },
    ]);
    await expect(findPageImage(client, "page")).resolves.toBeNull();
  });
});

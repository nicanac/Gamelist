import { Client, collectAllDataSourceRows, isFullBlock, isFullPage } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client";
import { assignSlugs, normalizePage, sortByName, type NotionPageLike } from "./normalize";
import type { Game } from "./types";

export interface NotionConfig {
  token: string;
  dataSourceId?: string;
  databaseId?: string;
}

/** Reads Notion settings from the environment; `null` means "use the snapshot". */
export function getNotionConfig(env: NodeJS.ProcessEnv = process.env): NotionConfig | null {
  const token = env.NOTION_TOKEN?.trim();
  const dataSourceId = env.NOTION_DATA_SOURCE_ID?.trim() || undefined;
  const databaseId = env.NOTION_DATABASE_ID?.trim() || undefined;
  if (!token || (!dataSourceId && !databaseId)) return null;
  return { token, dataSourceId, databaseId };
}

export function createNotionClient(token: string): Client {
  return new Client({ auth: token, retry: { maxRetries: 4 } });
}

async function resolveDataSourceId(client: Client, config: NotionConfig): Promise<string> {
  if (config.dataSourceId) return config.dataSourceId;
  const database = await client.databases.retrieve({ database_id: config.databaseId! });
  const dataSource = "data_sources" in database ? database.data_sources[0] : undefined;
  if (!dataSource) throw new Error(`Notion database ${config.databaseId} has no data source`);
  return dataSource.id;
}

export async function fetchNotionPages(config: NotionConfig, client = createNotionClient(config.token)) {
  const dataSourceId = await resolveDataSourceId(client, config);
  const rows = await collectAllDataSourceRows(client, { data_source_id: dataSourceId });
  return rows.filter((row): row is PageObjectResponse => isFullPage(row));
}

export async function fetchGamesFromNotion(config: NotionConfig): Promise<Game[]> {
  const pages = await fetchNotionPages(config);
  return sortByName(assignSlugs(pages.map((page) => normalizePage(page as NotionPageLike))));
}

/** Returns a freshly signed URL for a Notion-hosted page cover (or `cover` files property). */
export async function fetchNotionCoverUrl(token: string, pageId: string): Promise<string | null> {
  const page = await createNotionClient(token).pages.retrieve({ page_id: pageId });
  if (!isFullPage(page)) return null;
  const prop = page.properties.cover ?? page.properties.Cover;
  if (prop?.type === "files") {
    const file = prop.files[0];
    if (file?.type === "file") return file.file.url;
    if (file?.type === "external") return file.external.url;
  }
  if (page.cover?.type === "file") return page.cover.file.url;
  if (page.cover?.type === "external") return page.cover.external.url;
  return null;
}

const IMAGE_URL = /^https?:\/\/\S+\.(?:jpe?g|png|webp|avif|gif)(?:\?\S*)?$/i;

/**
 * Finds the first externally hosted image near the top of a game's page: an
 * image block, or a paragraph that links straight to an image file.
 */
export async function findPageImage(client: Client, pageId: string): Promise<string | null> {
  const { results } = await client.blocks.children.list({ block_id: pageId, page_size: 25 });
  for (const block of results) {
    if (!isFullBlock(block)) continue;
    if (block.type === "image" && block.image.type === "external") return block.image.external.url;
    if (block.type === "paragraph") {
      for (const part of block.paragraph.rich_text) {
        const href = part.href ?? (part.type === "text" ? part.text.link?.url : undefined);
        if (href && IMAGE_URL.test(href)) return href;
      }
    }
  }
  return null;
}

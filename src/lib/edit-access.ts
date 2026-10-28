import { timingSafeEqual } from "node:crypto";

/**
 * - `open`: the local dev server, no password.
 * - `password`: deployed, saving needs `EDIT_PASSWORD`.
 * - `off`: read-only (no Notion token, or deployed without a password).
 */
export type EditMode = "open" | "password" | "off";

export function getEditMode(env: NodeJS.ProcessEnv = process.env): EditMode {
  if (!env.NOTION_TOKEN?.trim()) return "off";
  if (env.NODE_ENV === "development") return "open";
  return env.EDIT_PASSWORD ? "password" : "off";
}

export function passwordMatches(given: string | undefined, expected: string): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

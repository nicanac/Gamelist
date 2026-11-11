import { timingSafeEqual } from "node:crypto";

/**
 * - `open`: the local dev server or SSO-protected proxy (`TRUST_PROXY_AUTH=true`), no password.
 * - `password`: deployed, saving needs `EDIT_PASSWORD`.
 * - `off`: read-only (no Brain token, or deployed without `EDIT_PASSWORD` / `TRUST_PROXY_AUTH`).
 */
export type EditMode = "open" | "password" | "off";

export function getEditMode(env: NodeJS.ProcessEnv = process.env): EditMode {
  const hasToken = Boolean(env.BRAIN_TOKEN?.trim() || env.BRAIN_API_TOKEN?.trim());
  if (!hasToken) return "off";
  if (env.NODE_ENV === "development") return "open";
  if (env.EDIT_PASSWORD?.trim()) return "password";
  return env.TRUST_PROXY_AUTH === "true" ? "open" : "off";
}

export function passwordMatches(given: string | undefined, expected: string): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

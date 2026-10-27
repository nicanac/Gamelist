/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function foldText(value: string): string {
  return value
    .replace(/[™®©'’]/g, "") // before NFKD, which would expand ™ into "TM"
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return foldText(value).replace(/\s+/g, "-").slice(0, 80) || "game";
}

/**
 * Normalizes a game title for fuzzy comparisons: drops parentheticals,
 * edition suffixes and a leading article.
 */
export function normalizeTitle(value: string): string {
  return foldText(
    value
      .replace(/\([^)]*\)/g, " ")
      .replace(
        /\b(deluxe|ultimate|complete|definitive|special|collector'?s|limited|gold|premium|standard|digital deluxe|game of the year|goty|launch|anniversary)\s+edition\b/gi,
        " ",
      ),
  ).replace(/^the\s+/, "");
}

/** Dice coefficient over word tokens of two normalized titles (0–1). */
export function titleSimilarity(a: string, b: string): number {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared += 1;
  return (2 * shared) / (leftTokens.size + rightTokens.size);
}

/** Small, stable 32-bit string hash (FNV-1a). */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Cleans multi-line text coming from Notion rich text. */
export function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

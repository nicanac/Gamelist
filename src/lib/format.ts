const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
const syncFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const numberFormat = new Intl.NumberFormat("en");

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : dateFormat.format(time);
}

export function formatSync(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "unknown" : `${syncFormat.format(time)} UTC`;
}

export function releaseYear(iso: string | null): string | null {
  return iso ? iso.slice(0, 4) : null;
}

export function formatHours(hours: number | null): string | null {
  if (hours == null) return null;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export type ScoreTone = "good" | "mixed" | "bad";

/** Metacritic's own bands: 75+ favorable, 50–74 mixed, below 50 unfavorable. */
export function metacriticTone(score: number): ScoreTone {
  if (score >= 75) return "good";
  if (score >= 50) return "mixed";
  return "bad";
}

/**
 * Status palette from the dataviz reference (good / warning / critical);
 * ink follows the palette's "label inside a status fill" rule.
 */
export const TONE_STYLE: Record<ScoreTone, { fill: string; ink: string; label: string }> = {
  good: { fill: "#0ca30c", ink: "#ffffff", label: "Favorable" },
  mixed: { fill: "#fab219", ink: "#0b0b0b", label: "Mixed" },
  bad: { fill: "#d03b3b", ink: "#ffffff", label: "Unfavorable" },
};

export const DIFFICULTY_LEVELS = ["Easy", "Easy-Medium", "Medium", "Medium-Hard", "Hard", "Very Hard"];

export function difficultyLevel(difficulty: string | null): number {
  if (!difficulty) return -1;
  return DIFFICULTY_LEVELS.findIndex((level) => level.toLowerCase() === difficulty.toLowerCase());
}

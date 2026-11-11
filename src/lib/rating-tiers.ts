export interface RatingTier {
  label: string;
  color: string;
}

/** Semantic tier metadata on the 1–20 scale, matching Gamelist's Metacritic palette. */
export function getRatingTier(score: number | null): RatingTier {
  if (score === null || score <= 0) return { label: "Not rated", color: "#8b8a93" };
  if (score <= 6) return { label: "Skip", color: "#ef4444" };
  if (score <= 11) return { label: "Mixed", color: "#f59e0b" };
  if (score <= 15) return { label: "Solid", color: "#84cc16" };
  if (score <= 18) return { label: "Favorable", color: "#22c55e" };
  return { label: "Masterpiece", color: "#a855f7" };
}

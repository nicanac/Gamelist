import type { Game } from "./types";

/** Image URL for a game: its known cover, or the server-side lookup route. */
export function coverSrc(game: Pick<Game, "id" | "name" | "platform" | "releaseDate" | "cover">): string {
  if (game.cover) return game.cover;
  const params = new URLSearchParams({ name: game.name });
  if (game.platform) params.set("platform", game.platform);
  if (game.releaseDate) params.set("year", game.releaseDate.slice(0, 4));
  return `/api/cover/${game.id}?${params}`;
}

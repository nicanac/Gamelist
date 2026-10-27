import type { Metadata } from "next";
import { LibraryExperience } from "@/components/library-experience";
import { getLibrary } from "@/lib/library";
import { computeStats } from "@/lib/stats";

export async function generateMetadata(): Promise<Metadata> {
  const { games } = await getLibrary();
  const finished = games.filter((game) => game.status === "Done").length;
  return {
    title: `Game Library · ${games.length} games`,
    description: `${games.length} games, ${finished} finished: a personal game library synced from Notion.`,
  };
}

export default async function Home() {
  const library = await getLibrary();
  return <LibraryExperience library={library} stats={computeStats(library.games)} />;
}

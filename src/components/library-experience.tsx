"use client";

import { useMemo, useRef, useState } from "react";
import { DEFAULT_FILTERS, filterGames, type GameFilters } from "@/lib/filters";
import { sortByName } from "@/lib/normalize";
import type { LibraryStats } from "@/lib/stats";
import { hashString } from "@/lib/text";
import type { Game, Library } from "@/lib/types";
import { setSearchParam, useSearchParam } from "@/hooks/use-search-param";
import { Collection } from "./collection";
import { GameModal } from "./game-modal";
import { Hero } from "./hero";
import { Intro } from "./intro";
import { NowPlaying } from "./now-playing";
import { Cursor, SiteFooter, SiteNav } from "./site-chrome";
import { scrollToTarget, SmoothScroll, useLenisRef } from "./smooth-scroll";
import { StatsSection } from "./stats-section";

interface LibraryExperienceProps {
  library: Library;
  stats: LibraryStats;
}

export function LibraryExperience(props: LibraryExperienceProps) {
  return (
    <SmoothScroll>
      <Experience {...props} />
    </SmoothScroll>
  );
}

/** Well-rated, notable games in a stable shuffled order for the hero wall. */
function pickWallGames(games: Game[]): Game[] {
  const notable = [...games]
    .filter((game) => game.status !== "Dropped")
    .sort((a, b) => (b.metacritic ?? 0) - (a.metacritic ?? 0) || hashString(a.id) - hashString(b.id))
    .slice(0, 36);
  return notable.sort((a, b) => hashString(`wall:${a.id}`) - hashString(`wall:${b.id}`));
}

function Experience({ library, stats }: LibraryExperienceProps) {
  const games = library.games;
  const [ready, setReady] = useState(false);
  const [filters, setFilters] = useState<GameFilters>(DEFAULT_FILTERS);
  const sourceRef = useRef<HTMLElement | null>(null);
  const pushedEntry = useRef(false);
  const lenisRef = useLenisRef();

  const bySlug = useMemo(() => new Map(games.map((game) => [game.slug, game])), [games]);
  const visible = useMemo(() => filterGames(games, filters), [games, filters]);
  const nowPlaying = useMemo(() => sortByName(games.filter((game) => game.status === "In progress")), [games]);
  const wallGames = useMemo(() => pickWallGames(games), [games]);

  // The open game lives in the URL (?game=slug): deep links and Back just work.
  const slug = useSearchParam("game");
  const openGame = slug ? (bySlug.get(slug) ?? null) : null;
  const index = openGame ? visible.findIndex((game) => game.id === openGame.id) : -1;

  const open = (game: Game, source: HTMLElement | null) => {
    sourceRef.current = source;
    pushedEntry.current = true;
    setSearchParam("game", game.slug, "push");
  };

  const close = () => {
    if (pushedEntry.current) {
      pushedEntry.current = false;
      window.history.back();
    } else {
      setSearchParam("game", null, "replace");
    }
  };

  const step = (direction: -1 | 1) => {
    if (!openGame) return;
    const list = visible.length ? visible : games;
    const current = list.findIndex((game) => game.id === openGame.id);
    const next = list[(current + direction + list.length) % list.length];
    sourceRef.current = document.querySelector<HTMLElement>(`[data-card-id="${next.id}"] [data-cover-source]`);
    setSearchParam("game", next.slug, "replace");
  };

  return (
    <>
      <a
        href="#collection"
        className="sr-only z-[200] rounded-full bg-ink px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to the collection
      </a>
      <Intro total={games.length} onDone={() => setReady(true)} />
      <div className="grain" aria-hidden="true" />
      <Cursor />
      <SiteNav library={library} />

      <main>
        <Hero
          stats={stats}
          wallGames={wallGames}
          source={library.source}
          syncedAt={library.syncedAt}
          ready={ready}
          onExplore={() => scrollToTarget(lenisRef.current, "#collection", -8)}
        />
        <NowPlaying games={nowPlaying} onOpen={open} />
        <StatsSection stats={stats} />
        <Collection games={games} visible={visible} filters={filters} onFiltersChange={setFilters} onOpen={open} />
      </main>

      <SiteFooter library={library} />

      <GameModal
        game={openGame}
        position={index >= 0 ? { index, total: visible.length } : null}
        sourceRef={sourceRef}
        onClose={close}
        onStep={step}
      />
    </>
  );
}

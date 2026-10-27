"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { filterGames, type GameFilters } from "@/lib/filters";
import { Flip, gsap, ScrollTrigger } from "@/lib/gsap";
import { platformMeta } from "@/lib/platforms";
import { STATUS_ORDER } from "@/lib/status";
import type { Game, GameStatus } from "@/lib/types";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media-query";
import { FilterBar, type FacetOption } from "./filter-bar";
import { GameCard } from "./game-card";

interface CollectionProps {
  games: Game[];
  visible: Game[];
  filters: GameFilters;
  onFiltersChange: (filters: GameFilters) => void;
  onOpen: (game: Game, source: HTMLElement | null) => void;
}

function countOptions(values: string[], label: (value: string) => string = (value) => value): FacetOption[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function Collection({ games, visible, filters, onFiltersChange, onOpen }: CollectionProps) {
  const grid = useRef<HTMLUListElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();

  const visibleIds = new Set(visible.map((game) => game.id));
  // Visible cards first, in sort order; the rest stay mounted (hidden) so Flip can animate them in and out.
  const ordered = [...visible, ...games.filter((game) => !visibleIds.has(game.id))];

  // Status counts reflect every other active filter, so the chips preview their result.
  const statusCounts = Object.fromEntries(
    STATUS_ORDER.map(({ status }) => [status, 0]),
  ) as Record<GameStatus, number>;
  for (const game of filterGames(games, { ...filters, statuses: [] })) statusCounts[game.status] += 1;
  const platformOptions = countOptions(
    games.flatMap((game) => (game.platform ? [game.platform] : [])),
    (platform) => platformMeta(platform).short,
  );
  const genreOptions = countOptions(games.flatMap((game) => game.genres));

  const changeFilters = (next: GameFilters) => {
    if (grid.current && !reducedMotion) {
      // getState also settles any Flip still in flight, so rapid changes chain smoothly.
      flipState.current = Flip.getState(grid.current.querySelectorAll("[data-flip-card]"));
    }
    onFiltersChange(next);
  };

  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    Flip.from(state, {
      duration: 0.8,
      ease: "expo.inOut",
      absoluteOnLeave: true,
      stagger: { amount: 0.18 },
      onEnter: (elements) =>
        gsap.fromTo(
          elements,
          { opacity: 0, scale: 0.86 },
          { opacity: 1, scale: 1, duration: 0.7, delay: 0.2, ease: "expo.out", clearProps: "opacity,scale" },
        ),
      onLeave: (elements) => gsap.to(elements, { opacity: 0, scale: 0.86, duration: 0.35, ease: "power2.in" }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  }, [visible]);

  // Reveal cards as they scroll into view, a row at a time.
  useEffect(() => {
    const cards = grid.current?.querySelectorAll<HTMLElement>("[data-flip-card]:not([data-revealed])");
    if (!cards?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const card = entry.target as HTMLElement;
          card.style.setProperty("--reveal-delay", `${(order % 6) * 70}ms`);
          card.dataset.revealed = "";
          observer.unobserve(card);
          order += 1;
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="collection"
      aria-labelledby="collection-title"
      className="relative px-[var(--gutter)] pt-[clamp(80px,12vh,140px)] pb-32"
    >
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-muted uppercase">03 — The collection</p>
          <h2
            id="collection-title"
            className="mt-5 font-display text-[clamp(36px,5vw,76px)] leading-[0.95] font-extrabold tracking-[-0.04em] uppercase"
          >
            Every <span className="outline-text">single</span> game
          </h2>
        </div>
        <p className="font-mono text-xs text-muted" aria-live="polite">
          Showing <span className="text-ink">{visible.length}</span> of {games.length}
        </p>
      </header>

      <div className="z-30 mb-10 lg:sticky lg:top-[calc(var(--nav-height)+12px)]">
        <FilterBar
          filters={filters}
          onChange={changeFilters}
          statusCounts={statusCounts}
          platformOptions={platformOptions}
          genreOptions={genreOptions}
          total={games.length}
        />
      </div>

      <ul
        ref={grid}
        className="relative grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
      >
        {ordered.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            hidden={!visibleIds.has(game.id)}
            tilt={finePointer && !reducedMotion}
            onOpen={onOpen}
          />
        ))}
      </ul>

      {visible.length === 0 && (
        <div className="mx-auto max-w-md py-24 text-center">
          <p className="font-display text-2xl font-bold uppercase">No match</p>
          <p className="mt-3 text-sm text-muted">Nothing in the library fits these filters. Try loosening them.</p>
        </div>
      )}
    </section>
  );
}

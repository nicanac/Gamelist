"use client";

import { useRef, type MouseEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatHours, releaseYear } from "@/lib/format";
import { platformShort } from "@/lib/platforms";
import type { Game } from "@/lib/types";
import { GameCover } from "./game-cover";
import { ClockIcon } from "./icons";

interface NowPlayingProps {
  games: Game[];
  onOpen: (game: Game, source: HTMLElement | null) => void;
}

export function NowPlaying({ games, onOpen }: NowPlayingProps) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const distance = () => Math.max(0, track.current!.scrollWidth - window.innerWidth);
        const scroll = gsap.to(track.current, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        gsap.to("[data-np-progress]", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: section.current, start: "top top", end: () => `+=${distance()}`, scrub: true },
        });
        // Parallax moves only the real cover image (never the generated art, whose text must stay in frame).
        gsap.utils.toArray<HTMLElement>("[data-np-frame]", section.current).forEach((frame) => {
          gsap.fromTo(
            frame.querySelector("img"),
            { xPercent: -6, scale: 1.16 },
            {
              xPercent: 6,
              scale: 1.16,
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                containerAnimation: scroll,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: section },
  );

  if (!games.length) return null;

  const open = (game: Game) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(game, event.currentTarget.querySelector<HTMLElement>("[data-cover-source]"));
  };

  const heading = (
    <>
      <p className="font-mono text-[11px] tracking-[0.3em] text-muted uppercase">01 — Now playing</p>
      <h2 className="mt-5 font-display text-[clamp(34px,4.3vw,68px)] leading-[0.95] font-extrabold tracking-[-0.04em] uppercase">
        {games.length} games
        <br />
        <span className="outline-text">in progress</span>
      </h2>
      <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink-2">
        The current rotation, everything marked <em className="text-ink not-italic">In progress</em> in Notion.
      </p>
    </>
  );

  return (
    <section ref={section} id="playing" aria-label="Now playing" className="relative overflow-hidden">
      <div className="flex flex-col justify-center py-24 min-[900px]:min-h-[100svh] min-[900px]:flex-row min-[900px]:items-center">
        {/* Phones: heading above a swipeable row. Wide screens: heading rides along the pinned track. */}
        <header className="mb-10 px-[var(--gutter)] min-[900px]:hidden">{heading}</header>
        <div
          ref={track}
          className="scrollbar-none flex w-full snap-x snap-mandatory scroll-px-[var(--gutter)] gap-[clamp(20px,3vw,44px)] overflow-x-auto px-[var(--gutter)] min-[900px]:w-max min-[900px]:overflow-visible"
        >
          <header className="hidden w-[min(82vw,520px)] shrink-0 flex-col justify-center min-[900px]:flex">
            {heading}
            <div className="mt-10 h-px w-56 bg-line">
              <div data-np-progress className="h-full origin-left scale-x-0 bg-ink" />
            </div>
          </header>

          {games.map((game, index) => (
            <article key={game.id} className="w-[min(72vw,340px)] shrink-0 snap-start">
              <a
                href={`?game=${game.slug}`}
                onClick={open(game)}
                data-cursor="Open"
                className="group block rounded-[26px] focus-visible:outline-offset-4"
              >
                <div
                  data-np-frame
                  className="relative overflow-hidden rounded-[26px] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]"
                >
                  <GameCover
                    game={game}
                    eager={index < 4}
                    className="transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105"
                  />
                  <div data-cover-source className="absolute inset-0" />
                  <span className="absolute top-4 right-4 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[11px] text-white/85 backdrop-blur-md">
                    {String(index + 1).padStart(2, "0")} / {String(games.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-lg leading-snug font-semibold text-balance">{game.name}</h3>
                    <p className="mt-1.5 font-mono text-xs text-muted">
                      {platformShort(game.platform)}
                      {releaseYear(game.releaseDate) ? ` · ${releaseYear(game.releaseDate)}` : ""}
                    </p>
                  </div>
                  {game.hltbHours != null && (
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-xs text-ink-2">
                      <ClockIcon size={13} />
                      {formatHours(game.hltbHours)}
                    </span>
                  )}
                </div>
              </a>
            </article>
          ))}
          <div className="w-px shrink-0" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

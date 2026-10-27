"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { formatSync } from "@/lib/format";
import type { LibraryStats } from "@/lib/stats";
import type { Game, Library } from "@/lib/types";
import { CoverWall } from "./cover-wall";
import { ArrowDownIcon } from "./icons";

interface HeroProps {
  stats: LibraryStats;
  wallGames: Game[];
  source: Library["source"];
  syncedAt: string;
  ready: boolean;
  onExplore: () => void;
}

export function Hero({ stats, wallGames, source, syncedAt, ready, onExplore }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const entrance = useRef<(() => void) | null>(null);
  const lines = [
    { word: "Played.", count: stats.finished },
    { word: "Playing.", count: stats.playing, holo: true },
    { word: "Up next.", count: stats.upNext },
  ];

  useGSAP(
    () => {
      const scope = root.current!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set("[data-hero-line]", { autoAlpha: 0 });
        gsap.set("[data-hero-fade]", { autoAlpha: 0, y: 28 });

        entrance.current = () => {
          // Gradient-clipped text cannot be split into chars, so it slides in whole.
          const words = gsap.utils.toArray<HTMLElement>("[data-hero-word]", scope);
          const split = SplitText.create(words, { type: "lines,chars", mask: "lines" });
          const timeline = gsap.timeline({ onComplete: () => split.revert() });
          timeline
            .set("[data-hero-line]", { autoAlpha: 1 })
            .from(split.chars, { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.035 })
            .from("[data-hero-solid]", { yPercent: 115, duration: 1.3 }, 0.18)
            .to("[data-hero-fade]", { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.35);
          gsap.utils.toArray<HTMLElement>("[data-count]", scope).forEach((element, index) => {
            const value = { n: 0 };
            timeline.to(
              value,
              {
                n: Number(element.dataset.count),
                duration: 1.6,
                ease: "power3.out",
                onUpdate: () => {
                  element.textContent = String(Math.round(value.n));
                },
              },
              0.4 + index * 0.12,
            );
          });
        };

        // Scroll-out parallax lives on wrappers so it never fights the entrance.
        gsap.utils.toArray<HTMLElement>("[data-hero-parallax]", scope).forEach((line, index) => {
          gsap.to(line, {
            yPercent: -40 - index * 30,
            opacity: 0,
            ease: "none",
            scrollTrigger: { trigger: scope, start: "top top", end: "bottom 20%", scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  useGSAP(() => {
    if (!ready || !entrance.current) return;
    entrance.current();
    entrance.current = null;
  }, [ready]);

  const live = source === "notion";
  const dot = live ? "bg-[#0ca30c]" : "bg-[#fab219]";

  return (
    <section ref={root} id="top" className="relative flex h-[100svh] min-h-[620px] flex-col overflow-hidden">
      <CoverWall games={wallGames} ready={ready} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_70%,rgb(8_8_12/0.35),rgb(8_8_12/0.92)_75%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/80 to-transparent" />
      <div className="aurora -left-40 top-1/4 h-[50vh] w-[50vh] bg-[#6b54ff]" />
      <div className="aurora -right-32 bottom-0 h-[45vh] w-[45vh] bg-[#e8579a] opacity-35" />

      <div className="relative z-10 mt-auto px-[var(--gutter)] pb-[clamp(40px,10vh,120px)]">
        <h1 className="sr-only">Game Library</h1>
        <p
          data-hero-fade
          className="mb-6 flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] text-ink-2 uppercase"
        >
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`}>
            <span className={`absolute inset-0 animate-ping rounded-full ${dot}`} />
          </span>
          {live ? "Live from Notion" : "Notion snapshot"} · {formatSync(syncedAt)}
        </p>

        <div className="font-display text-[clamp(52px,12.5vw,210px)] leading-[0.86] font-black tracking-[-0.045em] uppercase">
          <p className="sr-only">
            {stats.finished} games played, {stats.playing} playing and {stats.upNext} up next.
          </p>
          {lines.map((line) => (
            <div key={line.word} data-hero-parallax aria-hidden="true">
              <div data-hero-line className="flex items-start">
                {line.holo ? (
                  <span className="inline-block overflow-hidden pb-[0.04em]">
                    <span data-hero-solid className="holo-text inline-block">
                      {line.word}
                    </span>
                  </span>
                ) : (
                  <span data-hero-word>{line.word}</span>
                )}
                <span
                  data-count={line.count}
                  className="mt-[0.12em] ml-[0.08em] font-sans text-[0.18em] font-semibold tracking-normal text-ink-2"
                >
                  {line.count}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div data-hero-fade className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-md text-[15px] leading-relaxed text-balance text-ink-2">
            {stats.total} games across {stats.platformCount} platforms and {stats.franchiseCount} franchises, every
            one of them tracked in Notion.
          </p>
          <button
            type="button"
            onClick={onExplore}
            data-cursor="Go"
            className="group glass inline-flex items-center gap-3 rounded-full py-3 pr-3 pl-6 text-sm font-medium transition-colors hover:bg-white/10"
          >
            Explore the collection
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-bg transition-transform duration-500 group-hover:translate-y-0.5">
              <ArrowDownIcon />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

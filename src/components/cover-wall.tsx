"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { Game } from "@/lib/types";
import { GameCover } from "./game-cover";

const ROWS = 4;

/**
 * Decorative, endlessly drifting wall of covers behind the hero. Separate
 * wrappers own separate transforms: scroll scrub, pointer parallax, the 3D
 * tilt and each row's marquee, so tweens never fight over one matrix.
 */
export function CoverWall({ games, ready }: { games: Game[]; ready: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const reveal = useRef<gsap.core.Tween | null>(null);
  const rows = Array.from({ length: ROWS }, (_, row) => games.filter((_, index) => index % ROWS === row));

  useGSAP(
    () => {
      const scroller = root.current!.querySelector<HTMLElement>("[data-wall-scroll]")!;
      const tilt = root.current!.querySelector<HTMLElement>("[data-wall-tilt]")!;
      const plane = root.current!.querySelector<HTMLElement>("[data-wall-plane]")!;
      gsap.set(plane, { rotationX: 34, rotationZ: -12, scale: 1.3 });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(scroller, { autoAlpha: 0.55 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(scroller, { autoAlpha: 0, scale: 1.18 });
        reveal.current = gsap.to(scroller, { autoAlpha: 0.62, scale: 1, duration: 2.4, paused: true });

        gsap.utils.toArray<HTMLElement>("[data-wall-row]", root.current).forEach((row, index) => {
          const leftward = index % 2 === 0;
          gsap.fromTo(
            row,
            { xPercent: leftward ? 0 : -50 },
            { xPercent: leftward ? -50 : 0, duration: 80 + index * 14, ease: "none", repeat: -1 },
          );
        });

        gsap.to(scroller, {
          yPercent: 18,
          scale: 1.25,
          autoAlpha: 0.12,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });

        const rotateY = gsap.quickTo(tilt, "rotationY", { duration: 1.4, ease: "power3" });
        const rotateX = gsap.quickTo(tilt, "rotationX", { duration: 1.4, ease: "power3" });
        const onMove = (event: PointerEvent) => {
          rotateY((event.clientX / window.innerWidth - 0.5) * 8);
          rotateX((event.clientY / window.innerHeight - 0.5) * -6);
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  useGSAP(() => {
    if (ready) reveal.current?.play();
  }, [ready]);

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div data-wall-scroll className="wall-stage absolute inset-[-10%] opacity-0">
        <div data-wall-tilt className="h-full w-full [transform-style:preserve-3d]">
          <div data-wall-plane className="flex h-full w-full flex-col justify-center gap-[1.6vw]">
            {rows.map((row, index) => (
              <div key={index} data-wall-row className="wall-row flex w-max">
                {[...row, ...row].map((game, tile) => (
                  <div key={`${game.id}-${tile}`} className="mr-[1.6vw] w-[clamp(104px,11vw,200px)] shrink-0">
                    <GameCover game={game} eager={tile < row.length} className="rounded-[14px] shadow-2xl shadow-black/60" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

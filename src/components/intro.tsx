"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/** True after the first intro in this tab; storage can be unavailable (private mode). */
function seenThisSession(): boolean {
  try {
    if (window.sessionStorage.getItem("intro-seen")) return true;
    window.sessionStorage.setItem("intro-seen", "1");
  } catch {
    // No storage: just play the intro.
  }
  return false;
}

// Decided once per page load, so Strict Mode's double effects cannot flip it.
let skipIntro: boolean | null = null;

function shouldSkipIntro(): boolean {
  skipIntro ??=
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    new URLSearchParams(window.location.search).has("game") || // deep links go straight to the game
    seenThisSession();
  return skipIntro;
}

/**
 * Short count-up curtain that hands over to the hero. It waits for web fonts
 * (so the hero's split text measures correctly) but never longer than ~2s.
 */
export function Intro({ total, onDone }: { total: number; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const element = root.current!;
      if (shouldSkipIntro()) {
        element.style.display = "none";
        onDone();
        return;
      }
      element.style.animation = "none"; // JS owns the exit now; drop the CSS safety net.
      const value = { n: 0 };
      const timeline = gsap.timeline({ paused: true });
      timeline
        .to(value, {
          n: total,
          duration: 1.2,
          ease: "power3.inOut",
          onUpdate: () => {
            counter.current!.textContent = String(Math.round(value.n)).padStart(3, "0");
          },
        })
        .to("[data-intro-bar]", { scaleX: 1, duration: 1.2, ease: "power3.inOut" }, 0)
        .to("[data-intro-line]", { yPercent: -110, duration: 0.6, ease: "expo.in", stagger: 0.05 }, "+=0.15")
        .add(onDone, "-=0.05")
        .to(element, { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, "-=0.1")
        .set(element, { display: "none" });

      let cancelled = false;
      const start = () => {
        if (!cancelled) timeline.play();
      };
      const fallback = window.setTimeout(start, 900);
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        window.clearTimeout(fallback);
        start();
      });
      return () => {
        cancelled = true;
        window.clearTimeout(fallback);
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="intro fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg [clip-path:inset(0_0_0_0)]"
      aria-hidden="true"
    >
      <div className="overflow-hidden">
        <span
          ref={counter}
          data-intro-line
          className="block font-display text-[clamp(72px,18vw,220px)] leading-none font-black tracking-tight tabular-nums"
        >
          000
        </span>
      </div>
      <div className="mt-4 overflow-hidden">
        <span data-intro-line className="block font-mono text-xs tracking-[0.35em] text-muted uppercase">
          games · synced from Notion
        </span>
      </div>
      <div className="absolute bottom-[12vh] left-1/2 h-px w-[min(320px,60vw)] -translate-x-1/2 bg-line">
        <div data-intro-bar className="h-full origin-left scale-x-0 bg-ink" />
      </div>
    </div>
  );
}

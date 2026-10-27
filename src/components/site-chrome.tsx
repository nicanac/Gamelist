"use client";

import { useRef, type MouseEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatSync } from "@/lib/format";
import type { Library } from "@/lib/types";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media-query";
import { ArrowUpIcon } from "./icons";
import { scrollToTarget, useLenisRef } from "./smooth-scroll";

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="logo-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9085e9" />
          <stop offset="0.55" stopColor="#e87ba4" />
          <stop offset="1" stopColor="#f6b26b" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-holo)" />
      <path d="M12 9.5v13l11-6.5-11-6.5Z" fill="#08080c" />
    </svg>
  );
}

const LINKS = [
  { id: "playing", label: "Playing" },
  { id: "stats", label: "Stats" },
  { id: "collection", label: "Collection" },
];

export function SiteNav({ library }: { library: Library }) {
  const lenisRef = useLenisRef();
  const onNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = event.currentTarget.getAttribute("href")!;
    event.preventDefault();
    scrollToTarget(lenisRef.current, target, target === "#top" ? 0 : -8);
  };
  const live = library.source === "notion";

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-[var(--gutter)] pt-3">
      <nav aria-label="Primary" className="glass mx-auto flex h-[52px] items-center justify-between rounded-full pr-2 pl-3">
        <a
          href="#top"
          onClick={onNavigate}
          className="flex items-center gap-2.5 font-display text-[12px] font-bold tracking-tight uppercase"
        >
          <LogoMark />
          <span className="hidden sm:inline">Game Library</span>
        </a>
        <ul className="flex items-center gap-0.5">
          {LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={onNavigate}
                className="rounded-full px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink sm:px-4"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <span
          className="hidden items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 font-mono text-[11px] text-ink-2 md:inline-flex"
          title={`Last read from Notion: ${formatSync(library.syncedAt)}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[#0ca30c]" : "bg-[#fab219]"}`} aria-hidden="true" />
          {live ? "Live" : "Snapshot"} · {library.games.length} games
        </span>
      </nav>
    </header>
  );
}

/** A soft follower ring that grows into a label over anything with `data-cursor`. */
export function Cursor() {
  const finePointer = useFinePointer();
  const reducedMotion = useReducedMotion();
  const enabled = finePointer && !reducedMotion;
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!enabled || !ring.current) return;
      gsap.set(ring.current, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const x = gsap.quickTo(ring.current, "x", { duration: 0.5, ease: "power3" });
      const y = gsap.quickTo(ring.current, "y", { duration: 0.5, ease: "power3" });
      let active = "";

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        x(event.clientX);
        y(event.clientY);
        gsap.to(ring.current, { autoAlpha: 1, duration: 0.3, overwrite: "auto" });
      };
      const onOver = (event: PointerEvent) => {
        const text = (event.target as Element).closest?.("[data-cursor]")?.getAttribute("data-cursor") ?? "";
        if (text === active) return;
        active = text;
        if (text) label.current!.textContent = text;
        gsap.to(ring.current, {
          width: text ? 84 : 34,
          height: text ? 84 : 34,
          backgroundColor: text ? "rgb(242 241 238 / 0.95)" : "rgb(242 241 238 / 0)",
          borderColor: text ? "rgb(242 241 238 / 0)" : "rgb(242 241 238 / 0.55)",
          duration: 0.5,
          ease: "expo.out",
        });
        gsap.to(label.current, { autoAlpha: text ? 1 : 0, scale: text ? 1 : 0.6, duration: 0.35 });
      };
      const onLeave = () => gsap.to(ring.current, { autoAlpha: 0, duration: 0.3 });

      window.addEventListener("pointermove", onMove);
      document.addEventListener("pointerover", onOver);
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      };
    },
    { dependencies: [enabled] },
  );

  if (!enabled) return null;
  return (
    <div
      ref={ring}
      className="cursor pointer-events-none fixed top-0 left-0 z-[95] grid h-[34px] w-[34px] place-items-center rounded-full border border-[rgb(242_241_238/0.55)]"
      aria-hidden="true"
    >
      <span ref={label} className="text-[12px] font-semibold text-bg opacity-0" />
    </div>
  );
}

export function SiteFooter({ library }: { library: Library }) {
  const lenisRef = useLenisRef();
  return (
    <footer className="relative overflow-hidden border-t border-line pt-20 pb-10">
      <div className="flex overflow-hidden" aria-hidden="true">
        <div className="marquee-track flex w-max shrink-0">
          {[0, 1].map((copy) => (
            <span
              key={copy}
              className="outline-text pr-10 font-display text-[clamp(64px,13vw,220px)] leading-none font-black tracking-[-0.04em] whitespace-nowrap uppercase"
            >
              Press start · Continue? ·{" "}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-16 flex flex-wrap items-end justify-between gap-8 px-[var(--gutter)]">
        <div>
          <p className="font-display text-xl font-bold uppercase">Continue?</p>
          <button
            type="button"
            onClick={() => scrollToTarget(lenisRef.current, 0)}
            data-cursor="Top"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            <ArrowUpIcon size={15} /> Yes, back to the top
          </button>
        </div>
        <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted">
          {library.games.length} games · {library.source === "notion" ? "read live from Notion" : "Notion snapshot"},{" "}
          {formatSync(library.syncedAt)}. Built with Next.js, GSAP and Lenis.
        </p>
      </div>
    </footer>
  );
}

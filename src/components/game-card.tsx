"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";
import { gsap } from "@/lib/gsap";
import { metacriticTone, releaseYear, TONE_STYLE } from "@/lib/format";
import { platformShort } from "@/lib/platforms";
import { statusMeta } from "@/lib/status";
import type { Game } from "@/lib/types";
import { GameCover } from "./game-cover";

export function MetacriticBadge({ score, className = "" }: { score: number; className?: string }) {
  const tone = TONE_STYLE[metacriticTone(score)];
  return (
    <span
      className={`inline-grid h-8 min-w-8 place-items-center rounded-[9px] px-1.5 text-[13px] font-bold tabular-nums shadow-lg shadow-black/40 ${className}`}
      style={{ background: tone.fill, color: tone.ink }}
      title={`Metacritic ${score} (${tone.label})`}
    >
      <span className="sr-only">Metacritic </span>
      {score}
    </span>
  );
}

export function StatusDot({ game }: { game: Pick<Game, "status"> }) {
  const meta = statusMeta(game.status);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

interface GameCardProps {
  game: Game;
  hidden: boolean;
  tilt: boolean;
  onOpen: (game: Game, source: HTMLElement | null) => void;
}

export function GameCard({ game, hidden, tilt, onOpen }: GameCardProps) {
  const surface = useRef<HTMLDivElement>(null);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tilt || event.pointerType !== "mouse") return;
    const element = surface.current!;
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    gsap.to(element, {
      rotationY: (x - 0.5) * 16,
      rotationX: (0.5 - y) * 16,
      scale: 1.04,
      transformPerspective: 700,
      duration: 0.5,
      ease: "power3.out",
      overwrite: "auto",
    });
    element.style.setProperty("--glare-x", `${x * 100}%`);
    element.style.setProperty("--glare-y", `${y * 100}%`);
  };

  const onPointerLeave = () => {
    if (!tilt) return;
    gsap.to(surface.current, { rotationX: 0, rotationY: 0, scale: 1, duration: 1, ease: "elastic.out(1, 0.55)", overwrite: "auto" });
  };

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(game, surface.current);
  };

  const year = releaseYear(game.releaseDate);

  return (
    <li data-flip-card data-card-id={game.id} hidden={hidden}>
      {/* The reveal runs on the link: GSAP folds CSS `translate` into its own transform on elements it animates (Flip owns the <li>). */}
      <a
        href={`?game=${game.slug}`}
        onClick={onClick}
        data-cursor="View"
        className="card reveal group block rounded-[18px]"
      >
        <div
          ref={surface}
          data-cover-source
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="tilt card-surface"
        >
          <GameCover game={game} className="rounded-[18px]" />
          <div className="glare rounded-[18px]" />
          <div className="card-ring" />
          {game.metacritic != null && <MetacriticBadge score={game.metacritic} className="absolute top-2.5 right-2.5" />}
        </div>
        <div className="mt-3 px-0.5">
          <h3 className="line-clamp-2 text-[14px] leading-snug font-medium text-ink transition-colors group-hover:text-white">
            {game.name}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
            <StatusDot game={game} />
            <span aria-hidden="true">·</span>
            <span>{platformShort(game.platform)}</span>
            {year && (
              <>
                <span aria-hidden="true">·</span>
                <span>{year}</span>
              </>
            )}
          </p>
        </div>
      </a>
    </li>
  );
}

import type { Ref } from "react";
import { coverSrc } from "@/lib/cover-src";
import type { Game } from "@/lib/types";
import { GenerativeCover } from "./generative-cover";

type CoverGame = Pick<Game, "id" | "name" | "platform" | "releaseDate" | "cover">;

/**
 * Real image when it loads, generated poster art underneath otherwise. Load
 * state lives on the <img> as data attributes so it also covers events that
 * fired before hydration, without re-rendering hundreds of cards.
 */
function trackLoad(img: HTMLImageElement | null) {
  if (!img?.complete) return;
  if (img.naturalWidth > 0) {
    img.style.transition = "none"; // already cached: show it without a fade
    img.dataset.loaded = "";
  } else if (img.currentSrc) {
    img.dataset.failed = ""; // a lazy image that has not started yet has no currentSrc
  }
}

export function GameCover({
  game,
  className = "",
  eager = false,
  alt = "",
  ref,
}: {
  game: CoverGame;
  className?: string;
  eager?: boolean;
  alt?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  const src = coverSrc(game);
  return (
    <div ref={ref} className={`cover-frame ${className}`}>
      <GenerativeCover game={game} />
      {/* Covers come from many hosts (and a redirecting route), so next/image does not apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        ref={trackLoad}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={(event) => {
          event.currentTarget.dataset.loaded = "";
        }}
        onError={(event) => {
          event.currentTarget.dataset.failed = "";
        }}
      />
    </div>
  );
}

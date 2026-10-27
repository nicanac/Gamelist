import type { CSSProperties } from "react";
import { platformMeta, type PlatformFamily } from "@/lib/platforms";
import { hashString } from "@/lib/text";
import type { Game } from "@/lib/types";

const FAMILY_HUE: Record<PlatformFamily, number> = {
  nintendo: 352,
  playstation: 222,
  xbox: 145,
  pc: 262,
  other: 296,
};

/** Deterministic PRNG so a game always gets the same artwork. */
function seeded(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function titleScale(name: string): number {
  if (name.length > 48) return 0.58;
  if (name.length > 32) return 0.7;
  if (name.length > 18) return 0.84;
  if (name.length > 9) return 1;
  return 1.2;
}

/**
 * Poster-style artwork shown until (or instead of) real cover art. The look is
 * all CSS (see `.gen-art` in globals.css); each game only sets a few variables.
 */
export function GenerativeCover({ game }: { game: Pick<Game, "id" | "name" | "platform"> }) {
  const random = seeded(hashString(`${game.id}:${game.name}`));
  const meta = platformMeta(game.platform);
  const hue = Math.round(FAMILY_HUE[meta.family] + random() * 60 - 30);
  const motif = Math.floor(random() * 4);
  const style = {
    "--h1": hue,
    "--h2": Math.round(hue + 35 + random() * 70),
    "--h3": Math.round(hue - 50 - random() * 40),
    "--ax": `${Math.round(15 + random() * 70)}%`,
    "--ay": `${Math.round(8 + random() * 40)}%`,
    "--bx": `${Math.round(random() * 100)}%`,
    "--by": `${Math.round(55 + random() * 45)}%`,
    "--angle": `${Math.round(random() * 4) * 15 + 15}deg`,
    "--title-scale": titleScale(game.name),
  } as CSSProperties;

  return (
    <div className={`gen-art gen-motif-${motif}`} style={style} aria-hidden="true">
      <span className="gen-tag">{meta.short}</span>
      <span className="gen-title">{game.name}</span>
    </div>
  );
}

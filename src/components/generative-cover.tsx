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

/** Advance widths of Unbounded ExtraBold capitals and digits, in em, measured in Chrome. */
const GLYPH_EM: Record<string, number> = {
  A: 0.98, B: 0.9, C: 0.94, D: 0.94, E: 0.8, F: 0.78, G: 0.97, H: 0.95, I: 0.36, J: 0.82, K: 0.88, L: 0.77,
  M: 1.26, N: 0.98, O: 0.97, P: 0.83, Q: 0.97, R: 0.86, S: 0.86, T: 0.83, U: 0.88, V: 0.95, W: 1.38, X: 0.9,
  Y: 0.94, Z: 0.82, "0": 0.94, "1": 0.54, "2": 0.85, "3": 0.85, "4": 0.88, "5": 0.82, "6": 0.87, "7": 0.77,
  "8": 0.91, "9": 0.87,
};

/** Width of one unbreakable run of the title, in em, after the title's -0.02em tracking. */
function wordEm(word: string): number {
  let em = 0;
  for (const char of word.toUpperCase().normalize("NFD").replace(/\p{M}/gu, "")) {
    em += (GLYPH_EM[char] ?? (/\p{L}/u.test(char) ? 0.9 : 0.4)) - 0.02;
  }
  return em;
}

/**
 * Title size as a multiple of 13cqi: smaller for longer names, and never so large that the
 * longest word overflows the 86cqi between the poster's 7cqi paddings and has to break.
 */
export function titleScale(name: string): number {
  const byLength = name.length > 48 ? 0.58 : name.length > 32 ? 0.7 : name.length > 18 ? 0.84 : name.length > 9 ? 1 : 1.2;
  const longest = Math.max(...name.split(/\s+|(?<=-)/).map(wordEm));
  return Math.min(byLength, Math.floor((86 / 13 / longest) * 0.97 * 100) / 100);
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

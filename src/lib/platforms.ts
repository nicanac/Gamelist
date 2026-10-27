export type PlatformFamily = "nintendo" | "playstation" | "xbox" | "pc" | "other";

export interface PlatformMeta {
  short: string;
  family: PlatformFamily;
  /** Higher is newer; used to order platform filters. */
  era: number;
}

const PLATFORMS: Record<string, PlatformMeta> = {
  "Nintendo Switch 2": { short: "Switch 2", family: "nintendo", era: 2025 },
  "PlayStation 5": { short: "PS5", family: "playstation", era: 2020 },
  "Xbox Series X|S": { short: "Xbox Series", family: "xbox", era: 2020 },
  "Nintendo Switch": { short: "Switch", family: "nintendo", era: 2017 },
  "PlayStation 4": { short: "PS4", family: "playstation", era: 2013 },
  "Wii U": { short: "Wii U", family: "nintendo", era: 2012 },
  "Nintendo 3DS": { short: "3DS", family: "nintendo", era: 2011 },
  "PlayStation 3": { short: "PS3", family: "playstation", era: 2006 },
  Wii: { short: "Wii", family: "nintendo", era: 2006 },
  "Xbox 360": { short: "Xbox 360", family: "xbox", era: 2005 },
  "Nintendo DS": { short: "DS", family: "nintendo", era: 2004 },
  "Nintendo GameCube": { short: "GameCube", family: "nintendo", era: 2001 },
  "Game Boy Advance": { short: "GBA", family: "nintendo", era: 2001 },
  "Game Boy Color": { short: "GBC", family: "nintendo", era: 1998 },
  "Nintendo 64": { short: "N64", family: "nintendo", era: 1996 },
  "Super Nintendo Entertainment System (SNES)": { short: "SNES", family: "nintendo", era: 1990 },
  "Game Boy": { short: "Game Boy", family: "nintendo", era: 1989 },
  "Nintendo Entertainment System (NES)": { short: "NES", family: "nintendo", era: 1983 },
  "PC (Microsoft Windows)": { short: "PC", family: "pc", era: 1985 },
  Hardware: { short: "Hardware", family: "other", era: 0 },
};

export const FAMILY_LABEL: Record<PlatformFamily, string> = {
  nintendo: "Nintendo",
  playstation: "PlayStation",
  xbox: "Xbox",
  pc: "PC",
  other: "Other",
};

export function platformMeta(platform: string | null): PlatformMeta {
  if (!platform) return { short: "Unknown", family: "other", era: -1 };
  return PLATFORMS[platform] ?? { short: platform, family: "other", era: 0 };
}

export function platformShort(platform: string | null): string {
  return platformMeta(platform).short;
}

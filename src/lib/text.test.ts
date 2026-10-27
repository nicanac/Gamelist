import { describe, expect, it } from "vitest";
import { cleanText, foldText, hashString, normalizeTitle, slugify, titleSimilarity } from "./text";

describe("foldText / slugify", () => {
  it("folds accents, symbols and apostrophes", () => {
    expect(foldText("Pokémon™ Let's Go, Pikachu!")).toBe("pokemon lets go pikachu");
    expect(slugify("Mario & Luigi: Bowser's Inside Story")).toBe("mario-and-luigi-bowsers-inside-story");
    expect(slugify("!!!")).toBe("game");
  });
});

describe("normalizeTitle", () => {
  it("drops parentheticals, edition suffixes and a leading article", () => {
    expect(normalizeTitle("The Legend of Zelda: Link's Awakening (Limited Edition)")).toBe("legend of zelda links awakening");
    expect(normalizeTitle("Dark Souls III: Game of the Year Edition")).toBe("dark souls iii");
  });
});

describe("titleSimilarity", () => {
  it("scores identical titles 1 and unrelated ones low", () => {
    expect(titleSimilarity("Dead Cells", "dead cells")).toBe(1);
    expect(titleSimilarity("Back 4 Blood: Deluxe Edition", "Back 4 Blood")).toBe(1);
    expect(titleSimilarity("Mortal Kombat 11 Ultimate", "Mortal Kombat 11")).toBeGreaterThan(0.8);
    expect(titleSimilarity("Tetris 99", "Tetris Effect")).toBeLessThan(0.6);
    expect(titleSimilarity("", "Anything")).toBe(0);
  });
});

describe("cleanText", () => {
  it("normalizes line breaks and trims", () => {
    expect(cleanText("  One<br /><br />Two\r\n\n\n\nThree  ")).toBe("One\n\nTwo\n\nThree");
    expect(cleanText("   ")).toBeNull();
    expect(cleanText(undefined)).toBeNull();
  });
});

describe("hashString", () => {
  it("is stable and spreads values", () => {
    expect(hashString("Dead Cells")).toBe(hashString("Dead Cells"));
    expect(hashString("Dead Cells")).not.toBe(hashString("Dead Cell"));
  });
});

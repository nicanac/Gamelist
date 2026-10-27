import { describe, expect, it } from "vitest";
import library from "@/data/library.json";
import { titleScale } from "./generative-cover";

// The poster leaves 86cqi for the title, set at 13cqi per unit of scale.
const AVAILABLE_EM = 86 / 13;

describe("titleScale", () => {
  it("keeps the length steps for names whose words fit", () => {
    expect(titleScale("Hades")).toBe(1.2);
    expect(titleScale("Super Mario Odyssey")).toBe(0.84);
    expect(titleScale("The Legend of Zelda: Breath of the Wild")).toBe(0.7);
  });

  it("shrinks a title whose longest word would overflow and break", () => {
    // "AIRWOLF" is about 5.9em wide in Unbounded ExtraBold: at 1.2 it would need 7.1em.
    expect(titleScale("Airwolf")).toBeLessThan(1.2);
    expect(titleScale("Airwolf") * 5.92).toBeLessThan(AVAILABLE_EM);
  });

  it("keeps every title in the snapshot at a legible size", () => {
    for (const game of library.games) {
      expect(titleScale(game.name), game.name).toBeGreaterThanOrEqual(0.5);
    }
  });
});

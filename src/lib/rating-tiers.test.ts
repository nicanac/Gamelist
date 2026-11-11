import { describe, expect, it } from "vitest";
import { getRatingTier } from "./rating-tiers";

describe("getRatingTier", () => {
  it("maps scores to semantic tiers", () => {
    expect(getRatingTier(null).label).toBe("Not rated");
    expect(getRatingTier(0).label).toBe("Not rated");
    expect(getRatingTier(5).label).toBe("Skip");
    expect(getRatingTier(10).label).toBe("Mixed");
    expect(getRatingTier(14).label).toBe("Solid");
    expect(getRatingTier(18).label).toBe("Favorable");
    expect(getRatingTier(19).label).toBe("Masterpiece");
    expect(getRatingTier(20).label).toBe("Masterpiece");
  });
});

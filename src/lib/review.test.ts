import { describe, expect, it } from "vitest";
import { getEditMode, passwordMatches } from "./edit-access";
import {
  catalogStateToStatus,
  parseReview,
  ratingOutOf20,
  statusToCatalogState,
  toCatalogProps,
  toGameListProps,
} from "./review";

const ID = "d4b7b0fd-f704-4e46-a03a-fc3030ecd193";

describe("ratingOutOf20", () => {
  it("converts the 0–100 rating back to the 20-point scale", () => {
    expect(ratingOutOf20(90)).toBe(18);
    expect(ratingOutOf20(87.5)).toBe(17.5);
    expect(ratingOutOf20(null)).toBeNull();
  });
});

describe("parseReview", () => {
  it("accepts a full review with UUID", () => {
    expect(parseReview({ id: ID, status: "Done", rating: 17.5, notes: "  Loved the Water Temple.  " })).toEqual({
      ok: true,
      review: { id: ID, status: "Done", rating: 17.5, notes: "Loved the Water Temple." },
    });
  });

  it("cleans multi-line feedback", () => {
    expect(parseReview({ id: ID, notes: "Great  \nshort\n\n\n\nfun" })).toEqual({
      ok: true,
      review: { id: ID, notes: "Great\nshort\n\nfun" },
    });
  });

  it("keeps only the fields that were sent", () => {
    expect(parseReview({ id: ID, rating: 12 })).toEqual({ ok: true, review: { id: ID, rating: 12 } });
  });

  it("treats a null rating and blank notes as clearing them", () => {
    expect(parseReview({ id: ID, rating: null, notes: "   " })).toEqual({
      ok: true,
      review: { id: ID, rating: null, notes: "" },
    });
  });

  it.each([
    [{ id: "not-a-uuid", rating: 10 }, "Unknown game."],
    [{ id: ID, status: "Finished" }, "Unknown status."],
    [{ id: ID, rating: 21 }, "The rating must be between 0.5 and 20, in half points."],
    [{ id: ID, rating: 0 }, "The rating must be between 0.5 and 20, in half points."],
    [{ id: ID, rating: 12.3 }, "The rating must be between 0.5 and 20, in half points."],
    [{ id: ID, rating: "12" }, "The rating must be between 0.5 and 20, in half points."],
    [{ id: ID, notes: "x".repeat(10_001) }, "Feedback is limited to 10,000 characters."],
    [{ id: ID }, "Nothing to save."],
  ])("rejects %j", (input, error) => {
    expect(parseReview(input)).toEqual({ ok: false, error });
  });
});

describe("status <-> catalog state mapping", () => {
  it("maps every GameStatus to its catalog state", () => {
    expect(statusToCatalogState("Not started")).toBe("To review");
    expect(statusToCatalogState("Want to Play")).toBe("To review");
    expect(statusToCatalogState("In progress")).toBe("Trying");
    expect(statusToCatalogState("Stalled")).toBe("Trying");
    expect(statusToCatalogState("Done")).toBe("In use");
    expect(statusToCatalogState("Dropped")).toBe("Rejected");
  });

  it("maps catalog states back to GameStatus", () => {
    expect(catalogStateToStatus("To review")).toBe("Want to Play");
    expect(catalogStateToStatus("Trying")).toBe("In progress");
    expect(catalogStateToStatus("In use")).toBe("Done");
    expect(catalogStateToStatus("Rejected")).toBe("Dropped");
  });
});

describe("Brain write payload helpers", () => {
  it("maps review fields to Game List props", () => {
    expect(toGameListProps({ id: ID, status: "Done", rating: 18, notes: "Great." })).toEqual({
      status: "Done",
      user_rating: 18,
      notes: "Great.",
    });
    expect(toGameListProps({ id: ID, rating: null, notes: "" })).toEqual({
      user_rating: null,
      notes: "",
    });
  });

  it("maps review status to Catalog state and reviewed date", () => {
    expect(toCatalogProps({ id: ID, status: "In progress", rating: 16 }, { today: "2026-11-11" })).toEqual({
      state: "Trying",
      reviewed: { start: "2026-11-11" },
    });
  });

  it("maps rating to 1..5 on standalone catalog items", () => {
    expect(toCatalogProps({ id: ID, rating: 18 }, { standalone: true })).toEqual({ rating: 5 });
    expect(toCatalogProps({ id: ID, rating: null }, { standalone: true })).toEqual({ rating: null });
  });
});

describe("getEditMode", () => {
  const token = { BRAIN_TOKEN: "brn_test" };

  it("is off without a Brain token, since there is nowhere to save", () => {
    expect(getEditMode({ NODE_ENV: "development" })).toBe("off");
  });

  it("is open on the local dev server", () => {
    expect(getEditMode({ ...token, NODE_ENV: "development" })).toBe("open");
  });

  it("needs EDIT_PASSWORD or TRUST_PROXY_AUTH=true once deployed", () => {
    expect(getEditMode({ ...token, NODE_ENV: "production" })).toBe("off");
    expect(getEditMode({ ...token, NODE_ENV: "production", EDIT_PASSWORD: "hunter2" })).toBe("password");
    expect(getEditMode({ ...token, NODE_ENV: "production", TRUST_PROXY_AUTH: "true" })).toBe("open");
  });
});

describe("passwordMatches", () => {
  it("compares the whole password", () => {
    expect(passwordMatches("hunter2", "hunter2")).toBe(true);
    expect(passwordMatches("hunter", "hunter2")).toBe(false);
    expect(passwordMatches(undefined, "hunter2")).toBe(false);
  });
});

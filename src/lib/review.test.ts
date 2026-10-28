import { describe, expect, it } from "vitest";
import { getEditMode, passwordMatches } from "./edit-access";
import { parseReview, ratingOutOf20, toNotionProperties } from "./review";

const ID = "d4b7b0fdf7044e46a03afc3030ecd193";

describe("ratingOutOf20", () => {
  it("converts the 0–100 rating back to the 20-point scale", () => {
    expect(ratingOutOf20(90)).toBe(18);
    expect(ratingOutOf20(87.5)).toBe(17.5);
    expect(ratingOutOf20(null)).toBeNull();
  });
});

describe("parseReview", () => {
  it("accepts a full review", () => {
    expect(parseReview({ id: ID, status: "Done", rating: 17.5, notes: "  Loved the Water Temple.  " })).toEqual({
      ok: true,
      review: { id: ID, status: "Done", rating: 17.5, notes: "Loved the Water Temple." },
    });
  });

  it("cleans feedback the way Notion text is read back", () => {
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
    [{ id: "not-a-page", rating: 10 }, "Unknown game."],
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

describe("toNotionProperties", () => {
  it("maps the review onto the Game List properties", () => {
    expect(toNotionProperties({ id: ID, status: "Done", rating: 18, notes: "Great." })).toEqual({
      status: { status: { name: "Done" } },
      user_rating: { number: 18 },
      notes: { rich_text: [{ type: "text", text: { content: "Great." } }] },
    });
  });

  it("clears the rating and notes", () => {
    expect(toNotionProperties({ id: ID, rating: null, notes: "" })).toEqual({
      user_rating: { number: null },
      notes: { rich_text: [] },
    });
  });

  it("splits long feedback into Notion's 2,000-character text blocks", () => {
    const notes = "a".repeat(4_500);
    const { notes: property } = toNotionProperties({ id: ID, notes }) as {
      notes: { rich_text: { text: { content: string } }[] };
    };
    expect(property.rich_text.map((part) => part.text.content.length)).toEqual([2000, 2000, 500]);
  });
});

describe("getEditMode", () => {
  const token = { NOTION_TOKEN: "ntn_x", NOTION_DATA_SOURCE_ID: "ds" };

  it("is off without Notion, since there is nowhere to save", () => {
    expect(getEditMode({ NODE_ENV: "development" })).toBe("off");
  });

  it("is open on the local dev server", () => {
    expect(getEditMode({ ...token, NODE_ENV: "development" })).toBe("open");
  });

  it("needs EDIT_PASSWORD once deployed", () => {
    expect(getEditMode({ ...token, NODE_ENV: "production" })).toBe("off");
    expect(getEditMode({ ...token, NODE_ENV: "production", EDIT_PASSWORD: "hunter2" })).toBe("password");
  });
});

describe("passwordMatches", () => {
  it("compares the whole password", () => {
    expect(passwordMatches("hunter2", "hunter2")).toBe(true);
    expect(passwordMatches("hunter", "hunter2")).toBe(false);
    expect(passwordMatches(undefined, "hunter2")).toBe(false);
  });
});

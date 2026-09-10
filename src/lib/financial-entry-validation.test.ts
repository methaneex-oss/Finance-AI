import { describe, expect, it } from "vitest";
import { validateEntryBody } from "./financial-entry-validation";

describe("financial entry validation", () => {
  it("accepts a valid entry with positive lines", () => {
    const result = validateEntryBody({
      entryDate: "2026-09-10",
      description: "Recorded receipts",
      lines: [{ categoryId: "cat-a", amount: "15000" }],
    });
    expect(result?.description).toBe("Recorded receipts");
    expect(result?.lines[0].amount).toBe(15000);
  });

  it("rejects missing descriptions", () => {
    expect(validateEntryBody({ entryDate: "2026-09-10", lines: [{ categoryId: "cat-a", amount: 10 }] })).toBeNull();
  });

  it("rejects zero, negative, and non-numeric amounts", () => {
    for (const amount of [0, -10, "not-a-number"]) {
      expect(validateEntryBody({ entryDate: "2026-09-10", description: "Test", lines: [{ categoryId: "cat-a", amount }] })).toBeNull();
    }
  });

  it("rejects entries without lines", () => {
    expect(validateEntryBody({ entryDate: "2026-09-10", description: "Test", lines: [] })).toBeNull();
  });
});

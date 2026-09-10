import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEntryBody } from "./financial-entry-validation";

test("accepts a valid entry with positive lines", () => {
  const result = validateEntryBody({ entryDate: "2026-09-10", description: "Recorded receipts", lines: [{ categoryId: "cat-a", amount: "15000" }] });
  assert.equal(result?.description, "Recorded receipts");
  assert.equal(result?.lines[0].amount, 15000);
  assert.equal(result?.lines[0].direction, "INCREASE");
});

test("accepts an explicit decrease direction", () => {
  const result = validateEntryBody({ entryDate: "2026-09-10", description: "Correction", lines: [{ categoryId: "cat-a", amount: "10.50", direction: "DECREASE" }] });
  assert.equal(result?.lines[0].direction, "DECREASE");
});

test("rejects missing descriptions", () => {
  assert.equal(validateEntryBody({ entryDate: "2026-09-10", lines: [{ categoryId: "cat-a", amount: 10 }] }), null);
});

test("rejects zero, negative, non-numeric, and over-precision amounts", () => {
  for (const amount of [0, -10, "not-a-number", "10.123"]) {
    assert.equal(validateEntryBody({ entryDate: "2026-09-10", description: "Test", lines: [{ categoryId: "cat-a", amount }] }), null);
  }
});

test("rejects entries without lines", () => {
  assert.equal(validateEntryBody({ entryDate: "2026-09-10", description: "Test", lines: [] }), null);
});

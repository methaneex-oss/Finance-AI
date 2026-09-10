import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateSummaryFromCategories } from "./accounting-engine-v2";

test("calculates income, expenses, funds and net result without floating point arithmetic", () => {
  const result = calculateSummaryFromCategories([
    { id: "income", name: "Offerings", classification: "INCOME", balance: "1000.10" },
    { id: "income-2", name: "Tithe", classification: "INCOME", balance: "2000.20" },
    { id: "expense", name: "Utilities", classification: "EXPENSE", balance: "450.30" },
    { id: "fund", name: "Building Fund", classification: "FUND", balance: "750.50" },
  ]);

  assert.deepEqual(result, { income: "3000.30", expenses: "450.30", funds: "750.50", netOperatingResult: "2550.00" });
});

test("handles negative category balances correctly", () => {
  const result = calculateSummaryFromCategories([
    { id: "expense", name: "Utilities", classification: "EXPENSE", balance: "-50.25" },
    { id: "income", name: "Receipts", classification: "INCOME", balance: "100.00" },
  ]);
  assert.equal(result.expenses, "-50.25");
  assert.equal(result.netOperatingResult, "150.25");
});

test("rejects an invalid accounting period", () => {
  const from = new Date("2026-09-10");
  const to = new Date("2026-09-01");
  assert.throws(() => calculateSummaryFromCategories([], from, to));
});

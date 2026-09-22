import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateExtractedAmounts, validateExtractedFinancialData } from "./multimodal-finance";

test("calculates an authoritative total from extracted monetary values", () => {
  const result = calculateExtractedAmounts([
    { value: 400, currency: "NGN" },
    { value: 2000, currency: "NGN" },
    { value: 450, currency: "NGN" },
    { value: 1150, currency: "NGN" },
  ]);

  assert.equal(result.currency, "NGN");
  assert.equal(result.total, 4000);
});

test("rejects mixed currencies from a single deterministic calculation", () => {
  assert.throws(
    () => calculateExtractedAmounts([
      { value: 100, currency: "NGN" },
      { value: 20, currency: "USD" },
    ]),
    /same currency/i,
  );
});

test("preserves evidence and confidence while validating extracted financial data", () => {
  const result = validateExtractedFinancialData({
    sourceId: "doc-1",
    fields: [
      { type: "amount", value: 5000, currency: "NGN", confidence: 0.98, evidence: { page: 1 } },
    ],
  });

  assert.equal(result.sourceId, "doc-1");
  assert.equal(result.fields[0].value, 5000);
  assert.equal(result.fields[0].evidence.page, 1);
});

test("rejects impossible extraction confidence", () => {
  assert.throws(
    () => validateExtractedFinancialData({
      sourceId: "doc-1",
      fields: [{ type: "amount", value: 100, currency: "NGN", confidence: 1.2, evidence: {} }],
    }),
    /confidence/i,
  );
});

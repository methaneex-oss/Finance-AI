import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateExtractedAmounts, createMultimodalExtractionService, validateExtractedFinancialData } from "./multimodal-finance";

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

test("calculates decimal amounts without floating-point drift", () => {
  const result = calculateExtractedAmounts([
    { value: 0.1, currency: "NGN" },
    { value: 0.2, currency: "NGN" },
  ]);

  assert.equal(result.total, 0.3);
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

test("normalizes provider output through the validation boundary", async () => {
  const service = createMultimodalExtractionService({
    async extract() {
      return {
        sourceId: "doc-2",
        fields: [
          { type: "amount", value: "1500", currency: "NGN", confidence: 0.91, evidence: { page: 2 } },
        ],
      };
    },
  });

  const result = await service.extract({ documentId: "doc-2", contentType: "image/jpeg", content: new Uint8Array([1, 2]) });
  assert.equal(result.fields[0].value, 1500);
  assert.equal(result.fields[0].evidence.page, 2);
});

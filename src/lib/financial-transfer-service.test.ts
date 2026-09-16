import assert from "node:assert/strict";
import { test } from "node:test";
import { createFinancialTransfer } from "./financial-transfer-service";

test("rejects transfers between the same category", async () => {
  await assert.rejects(
    createFinancialTransfer({
      organizationId: "org-a",
      entryDate: new Date("2026-09-10"),
      description: "Internal transfer",
      reference: null,
      branchId: null,
      fromCategoryId: "cat-a",
      toCategoryId: "cat-a",
      amount: "100.00",
    }),
    /different categories/
  );
});

test("rejects invalid transfer amounts before database work", async () => {
  for (const amount of ["0", "-1", "1.234", "not-a-number"]) {
    await assert.rejects(
      createFinancialTransfer({
        organizationId: "org-a",
        entryDate: new Date("2026-09-10"),
        description: "Internal transfer",
        reference: null,
        branchId: null,
        fromCategoryId: "cat-a",
        toCategoryId: "cat-b",
        amount,
      }),
      /positive value with at most two decimal places/
    );
  }
});

test("rejects an empty transfer description", async () => {
  await assert.rejects(
    createFinancialTransfer({
      organizationId: "org-a",
      entryDate: new Date("2026-09-10"),
      description: "   ",
      reference: null,
      branchId: null,
      fromCategoryId: "cat-a",
      toCategoryId: "cat-b",
      amount: "100.00",
    }),
    /description/
  );
});

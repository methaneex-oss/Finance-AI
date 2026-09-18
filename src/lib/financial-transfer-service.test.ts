import assert from "node:assert/strict";
import { test } from "node:test";
import { createFinancialTransfer } from "./financial-transfer-service";

const base = {
  organizationId: "org-a",
  description: "Internal transfer",
  reference: null,
  branchId: null,
  fromCategoryId: "cat-a",
  toCategoryId: "cat-b",
  amount: "100.00",
};

test("rejects transfers between the same category", async () => {
  await assert.rejects(createFinancialTransfer({ ...base, entryDate: new Date("2026-09-10"), toCategoryId: "cat-a" }), /different categories/);
});

test("rejects invalid transfer amounts before database work", async () => {
  for (const amount of ["0", "-1", "1.234", "not-a-number"]) {
    await assert.rejects(createFinancialTransfer({ ...base, entryDate: new Date("2026-09-10"), amount }), /positive value with at most two decimal places/);
  }
});

test("rejects an empty transfer description", async () => {
  await assert.rejects(createFinancialTransfer({ ...base, entryDate: new Date("2026-09-10"), description: "   " }), /description/);
});

test("rejects an invalid transfer date before database work", async () => {
  await assert.rejects(createFinancialTransfer({ ...base, entryDate: new Date("invalid") }), /date is invalid/);
});

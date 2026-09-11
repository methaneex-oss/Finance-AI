import assert from "node:assert/strict";
import { test } from "node:test";
import { getPeriodRange } from "./financial-periods";

test("daily period stays within the selected day", () => {
  const { from, to } = getPeriodRange("DAILY", new Date(2026, 8, 11, 15, 20));
  assert.equal(from.getDate(), 11);
  assert.equal(from.getHours(), 0);
  assert.equal(to.getDate(), 11);
  assert.equal(to.getHours(), 23);
});

test("weekly period is Monday through Sunday", () => {
  const { from, to } = getPeriodRange("WEEKLY", new Date(2026, 8, 11));
  assert.equal(from.getDay(), 1);
  assert.equal(to.getDay(), 0);
});

test("monthly period covers the complete month", () => {
  const { from, to } = getPeriodRange("MONTHLY", new Date(2026, 8, 11));
  assert.equal(from.getDate(), 1);
  assert.equal(to.getDate(), 30);
});

test("annual period covers January through December", () => {
  const { from, to } = getPeriodRange("ANNUAL", new Date(2026, 8, 11));
  assert.equal(from.getMonth(), 0);
  assert.equal(to.getMonth(), 11);
});

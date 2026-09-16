import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateMetricFormula } from "./metric-engine";

test("evaluates operator precedence and parentheses", () => {
  assert.equal(evaluateMetricFormula("income - expenses * 2", [{ alias: "income", value: 100 }, { alias: "expenses", value: 20 }]), 60);
  assert.equal(evaluateMetricFormula("(income - expenses) * 2", [{ alias: "income", value: 100 }, { alias: "expenses", value: 20 }]), 160);
});

test("supports numeric constants", () => {
  assert.equal(evaluateMetricFormula("revenue / 2 + 10", [{ alias: "revenue", value: 100 }]), 60);
});

test("rejects unknown aliases and division by zero", () => {
  assert.throws(() => evaluateMetricFormula("revenue + missing", [{ alias: "revenue", value: 10 }]), /Unknown formula alias/);
  assert.throws(() => evaluateMetricFormula("revenue / zero", [{ alias: "revenue", value: 10 }, { alias: "zero", value: 0 }]), /Division by zero/);
});

test("rejects malformed formulas", () => {
  assert.throws(() => evaluateMetricFormula("revenue +", [{ alias: "revenue", value: 10 }]), /cannot end with an operator/);
  assert.throws(() => evaluateMetricFormula("(revenue", [{ alias: "revenue", value: 10 }]), /Unbalanced parentheses/);
});

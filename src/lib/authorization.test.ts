import assert from "node:assert/strict";
import { test } from "node:test";
import { hasPermission } from "./authorization";

test("finance roles have explicit write boundaries", () => {
  assert.equal(hasPermission("OWNER", "finance:write"), true);
  assert.equal(hasPermission("ADMIN", "finance:write"), true);
  assert.equal(hasPermission("FINANCE_OFFICER", "finance:write"), true);
  assert.equal(hasPermission("AUDITOR", "finance:write"), false);
  assert.equal(hasPermission("VIEWER", "finance:write"), false);
});

test("audit and metric permissions are role-scoped", () => {
  assert.equal(hasPermission("AUDITOR", "audit:read"), true);
  assert.equal(hasPermission("VIEWER", "audit:read"), false);
  assert.equal(hasPermission("FINANCE_OFFICER", "metrics:manage"), true);
  assert.equal(hasPermission("AUDITOR", "metrics:manage"), false);
});

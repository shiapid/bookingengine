import assert from "node:assert/strict";
import test from "node:test";
import { isRecoveryCode, parseLogin, validateNewPassword } from "../src/lib/auth/validation.ts";
import { selectTenant } from "../src/lib/tenants/selection.ts";

function form(fields) {
  const result = new globalThis.FormData();
  for (const [name, value] of Object.entries(fields)) result.set(name, value);
  return result;
}

test("login requires valid email and password while preserving password whitespace", () => {
  assert.deepEqual(parseLogin(form({ email: " MITRA@EXAMPLE.COM ", password: " abc " })), {
    email: "mitra@example.com", password: " abc ",
  });
  assert.equal(parseLogin(form({ email: "mitra@example", password: "abc" })), null);
  assert.equal(parseLogin(form({ email: "mitra@example.com", password: "" })), null);
});

test("password reset validates length, byte limits, confirmation, and token shape", () => {
  const password = "password test fixture";
  assert.deepEqual(validateNewPassword(form({ password, confirmPassword: password })), {});
  assert.ok(validateNewPassword(form({ password, confirmPassword: "different value" })).error);
  assert.ok(validateNewPassword(form({ password: "é".repeat(37), confirmPassword: "é".repeat(37) })).error);
  assert.equal(isRecoveryCode("a".repeat(64)), true);
  assert.equal(isRecoveryCode("//external.example"), false);
  assert.equal(isRecoveryCode(null), false);
});

test("workspace selects only a server-provided membership and handles an empty account", () => {
  const tenant = { id: "tenant-a", name: "A", role: "member" };
  const second = { id: "tenant-b", name: "B", role: "admin" };
  assert.deepEqual(selectTenant([tenant, second], undefined), { status: "selected", tenant });
  assert.deepEqual(selectTenant([tenant, second], "tenant-b"), { status: "selected", tenant: second });
  assert.deepEqual(selectTenant([tenant], "tenant-b"), { status: "denied" });
  assert.deepEqual(selectTenant([tenant], ["tenant-a", "tenant-b"]), { status: "denied" });
  assert.deepEqual(selectTenant([], undefined), { status: "empty" });
});

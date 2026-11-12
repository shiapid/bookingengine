import assert from "node:assert/strict";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";

const origin = process.env.BOOKING_AUTH_TEST_ORIGIN;

test("HTTP auth routes require a session and reject an external recovery redirect", {
  skip: !origin && "Set BOOKING_AUTH_TEST_ORIGIN to a running local or staging build",
}, async () => {
  const request = (path, headers) => globalThis.fetch(new URL(path, origin), {
    redirect: "manual", signal: globalThis.AbortSignal.timeout(10000), headers,
  });
  const login = await request("/login");
  assert.equal(login.status, 200);
  assert.match(await login.text(), /Masuk ke akun mitra/);

  const workspace = await request("/workspace?tenant=untrusted");
  assert.ok([302, 303, 307, 308].includes(workspace.status));
  assert.equal(new URL(workspace.headers.get("location"), origin).pathname, "/login");

  const forgot = await request("/forgot-password");
  assert.equal(forgot.status, 200);
  assert.match(await forgot.text(), /Kirim tautan reset/);

  const recovery = await request("/auth/recovery?code=invalid&next=https://example.invalid");
  assert.equal(recovery.status, 303);
  assert.equal(recovery.headers.get("location"), "/reset-password?status=invalid");
  assert.equal(recovery.headers.has("set-cookie"), false);

  const shapedCode = await request(`/auth/recovery?code=${"a".repeat(36)}&next=https://example.invalid`);
  assert.equal(shapedCode.headers.get("location"), "/reset-password");
  const recoveryCookie = shapedCode.headers.get("set-cookie");
  assert.match(recoveryCookie, /Path=\/reset-password/i);
  assert.match(recoveryCookie, /HttpOnly/i);

  const reset = await request("/reset-password", { cookie: recoveryCookie.split(";")[0] });
  assert.equal(reset.status, 200);
  const html = await reset.text();
  assert.match(html, /Tautan reset tidak tersedia/);
  assert.doesNotMatch(html, /name="confirmPassword"/);
});

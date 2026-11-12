import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/health/route.ts";

test("health returns the service identity without caching", async () => {
  const response = GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "shiap-booking-engine",
  });
});

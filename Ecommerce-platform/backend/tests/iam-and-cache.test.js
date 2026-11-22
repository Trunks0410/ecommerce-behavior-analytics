import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAction } from "../src/core/middleware/auth.js";
import { getOrSetCache } from "../src/core/cache/redis.js";

test("evaluateAction grants wildcard '*' for Root Admin", () => {
  const allowed = new Set(["*"]);
  assert.equal(evaluateAction(allowed, "order:approve"), true);
  assert.equal(evaluateAction(allowed, "iam:manage"), true);
});

test("evaluateAction supports 'service:*' prefix wildcards", () => {
  const allowed = new Set(["order:*", "product:read"]);
  assert.equal(evaluateAction(allowed, "order:read"), true);
  assert.equal(evaluateAction(allowed, "order:cancel"), true);
  assert.equal(evaluateAction(allowed, "product:read"), true);
  assert.equal(evaluateAction(allowed, "product:approve"), false);
  assert.equal(evaluateAction(allowed, "iam:manage"), false);
});

test("getOrSetCache caches values in memory when REDIS_URL is not configured", async () => {
  let loaderCalls = 0;
  const key = `unit-test-${Date.now()}`;
  const loader = async () => {
    loaderCalls += 1;
    return { ok: true, count: loaderCalls };
  };

  const first = await getOrSetCache(key, loader, 60);
  const second = await getOrSetCache(key, loader, 60);

  assert.equal(loaderCalls, 1);
  assert.deepEqual(first, { ok: true, count: 1 });
  assert.deepEqual(second, { ok: true, count: 1 });
});

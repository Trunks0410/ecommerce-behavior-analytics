import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../src/core/utils/jwt.js";
import { generateTrackingNumber } from "../src/core/utils/helpers.js";
import { errorHandler } from "../src/core/middleware/errorHandler.js";
import { IAM_ACTIONS, DEFAULT_SYSTEM_POLICIES } from "../src/core/config/iamActions.js";

test("JWT helpers sign valid access and refresh tokens with expected claims", () => {
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_access_secret_123";
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test_refresh_secret_456";

  const user = { id: 42, email: "staff@meemart.com", role_id: 6 };
  const access = generateAccessToken(user);
  const refresh = generateRefreshToken(user);

  const decodedAccess = jwt.verify(access, process.env.ACCESS_TOKEN_SECRET);
  assert.equal(decodedAccess.id, 42);
  assert.equal(decodedAccess.email, "staff@meemart.com");
  assert.equal(decodedAccess.role_id, 6);

  const decodedRefresh = jwt.verify(refresh, process.env.REFRESH_TOKEN_SECRET);
  assert.equal(decodedRefresh.id, 42);
  assert.equal(decodedRefresh.email, undefined);
});

test("generateTrackingNumber produces unique UTE tracking codes", () => {
  const code1 = generateTrackingNumber();
  const code2 = generateTrackingNumber();
  assert.match(code1, /^UTE-[A-Z0-9]+-[A-Z0-9]+$/);
  assert.match(code2, /^UTE-[A-Z0-9]+-[A-Z0-9]+$/);
  assert.notEqual(code1, code2);
});

test("IAM_ACTIONS and DEFAULT_SYSTEM_POLICIES maintain valid catalog structure", () => {
  const actionValues = Object.values(IAM_ACTIONS);
  assert.ok(actionValues.length > 10);
  assert.equal(new Set(actionValues).size, actionValues.length);

  const adminPolicy = DEFAULT_SYSTEM_POLICIES.find((p) => p.code === "ADMIN_FULL_ACCESS");
  assert.ok(adminPolicy);
  assert.equal(adminPolicy.is_system, true);
  assert.ok(adminPolicy.actions.includes("*"));
});

test("errorHandler redacts stack and SQL details in production mode", () => {
  const prevEnv = process.env.NODE_ENV;
  const origError = console.error;
  console.error = () => {};

  try {
    const err = new Error("Sensitive DB failure");
    err.statusCode = 500;
    err.sql = "SELECT * FROM users";

    let capturedStatus = 0;
    let capturedBody = null;
    const res = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
      },
    };
    const req = { method: "GET", originalUrl: "/test" };

    process.env.NODE_ENV = "production";
    errorHandler(err, req, res, () => {});
    assert.equal(capturedStatus, 500);
    assert.equal(capturedBody.stack, undefined);
    assert.equal(capturedBody.failedSql, undefined);

    process.env.NODE_ENV = "development";
    errorHandler(err, req, res, () => {});
    assert.equal(capturedBody.message, "Sensitive DB failure");
    assert.equal(capturedBody.failedSql, "SELECT * FROM users");
  } finally {
    process.env.NODE_ENV = prevEnv;
    console.error = origError;
  }
});

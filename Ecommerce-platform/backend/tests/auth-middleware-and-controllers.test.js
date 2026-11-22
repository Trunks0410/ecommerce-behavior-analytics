import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { verifyToken, optionalVerifyToken } from "../src/core/middleware/auth.js";
import productController from "../src/modules/product/product.controller.js";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("verifyToken returns 401 when Authorization header is missing or invalid", () => {
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_access_secret_123";

  const res1 = createMockRes();
  let nextCalled1 = false;
  verifyToken({ headers: {} }, res1, () => { nextCalled1 = true; });
  assert.equal(res1.statusCode, 401);
  assert.equal(nextCalled1, false);

  const res2 = createMockRes();
  let nextCalled2 = false;
  verifyToken({ headers: { authorization: "Bearer invalid.jwt.token" } }, res2, () => { nextCalled2 = true; });
  assert.equal(res2.statusCode, 401);
  assert.equal(nextCalled2, false);
});

test("verifyToken attaches req.user and calls next() for valid JWT", () => {
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_access_secret_123";
  const token = jwt.sign({ id: 7, email: "admin@meemart.com", role_id: 1 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockRes();
  let nextCalled = false;

  verifyToken(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 7);
  assert.equal(req.user.email, "admin@meemart.com");
});

test("optionalVerifyToken allows anonymous requests with req.user = null", () => {
  const req = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;

  optionalVerifyToken(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user, null);
});

test("productController.visualSearch returns 400 when no image file is uploaded", async () => {
  const req = { file: null };
  const res = createMockRes();
  let forwardedErr = null;
  await productController.visualSearch(req, res, (err) => {
    forwardedErr = err;
  });
  assert.equal(forwardedErr, null);
  assert.equal(res.statusCode, 400);
});

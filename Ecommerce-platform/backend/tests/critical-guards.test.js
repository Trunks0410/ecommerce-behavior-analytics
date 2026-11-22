import test from "node:test";
import assert from "node:assert/strict";
import db from "../src/database/models/index.js";
import iamService from "../src/modules/iam/iam.service.js";
import authController from "../src/modules/auth/auth.controller.js";
import authService from "../src/modules/auth/auth.service.js";
import productController from "../src/modules/product/product.controller.js";
import productService from "../src/modules/product/product.service.js";

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

test("IAM Guard: deleteRole blocks deleting core system roles", async (t) => {
  t.mock.method(db.Role, "findByPk", async () => ({
    id: 1,
    role_name: "admin",
    is_system: true,
  }));

  await assert.rejects(() => iamService.deleteRole(1), /Không thể xóa vai trò hệ thống/);
});

test("IAM Guard: attachPolicyToRole and detachPolicyFromRole block modifying Root Admin", async (t) => {
  t.mock.method(db.Role, "findByPk", async () => ({
    id: 1,
    role_name: "admin",
    is_system: true,
  }));

  await assert.rejects(() => iamService.attachPolicyToRole(1, 2), /Root Admin/);
  await assert.rejects(() => iamService.detachPolicyFromRole(1, 2), /Root Admin/);
});

test("IAM Guard: updatePolicy blocks editing ADMIN_FULL_ACCESS and deletePolicy blocks system policies", async (t) => {
  t.mock.method(db.Policy, "findByPk", async () => ({
    id: 1,
    code: "ADMIN_FULL_ACCESS",
    is_system: true,
  }));

  await assert.rejects(() => iamService.updatePolicy(1, { name: "Hacked" }), /AdministratorAccess/);
  await assert.rejects(() => iamService.deletePolicy(1), /Không thể xóa Policy hệ thống/);
});

test("Auth Guard: login trims whitespace/tabs on email_or_phone and rejects missing fields with 400", async (t) => {
  let receivedPayload = null;
  t.mock.method(authService, "login", async (payload) => {
    receivedPayload = payload;
    return { status: 200, data: { user: { id: 5, role: "user" }, accessToken: "tok" } };
  });

  const resMissing = createMockRes();
  await authController.login({ body: { email_or_phone: "   ", password: "123" } }, resMissing);
  assert.equal(resMissing.statusCode, 400);

  const resTrimmed = createMockRes();
  await authController.login({ body: { email_or_phone: "\tcustomer@meemart.com ", password: "123" } }, resTrimmed);
  assert.equal(resTrimmed.statusCode, 200);
  assert.equal(receivedPayload.email_or_phone, "customer@meemart.com");
});

test("Auth Guard: refresh returns 400 when refreshToken is missing", async () => {
  const res = createMockRes();
  await authController.refresh({ cookies: {}, body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Refresh token is required");
});

test("Product Controller: getProducts resolves Accept-Language without ReferenceError", async (t) => {
  let capturedLang = null;
  t.mock.method(productService, "getProducts", async (_query, lang) => {
    capturedLang = lang;
    return { total: 0, products: [] };
  });

  const res = createMockRes();
  await productController.getProducts({ query: {}, headers: { "accept-language": "en-US,en;q=0.9" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedLang, "en");
});

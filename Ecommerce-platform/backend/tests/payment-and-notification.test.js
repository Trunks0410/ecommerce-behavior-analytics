import test from "node:test";
import assert from "node:assert/strict";
import EventEmitter from "node:events";
import vnpayService from "../src/modules/payment/vnpay.service.js";
import notificationController from "../src/modules/notification/notification.controller.js";

test("vnpayService creates a signed payment URL and verifies valid IPN callbacks", () => {
  process.env.VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE || "TESTTMN";
  process.env.VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET || "TESTHASHSECRET123456";
  process.env.VNPAY_URL = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  process.env.VNPAY_RETURN_URL = process.env.VNPAY_RETURN_URL || "http://localhost:5173/payment/vnpay-return";

  const paymentUrl = vnpayService.createPaymentUrl("127.0.0.1", "ORD12345", 250000, "Thanh toan don hang");
  const parsed = new URL(paymentUrl);
  const params = Object.fromEntries(parsed.searchParams.entries());

  assert.equal(params.vnp_TxnRef, "ORD12345");
  assert.equal(params.vnp_Amount, "25000000");
  assert.ok(params.vnp_SecureHash);
  assert.equal(vnpayService.verifyIpnCall(params), true);

  // Tampering with amount must invalidate signature
  const tampered = { ...params, vnp_Amount: "100" };
  assert.equal(vnpayService.verifyIpnCall(tampered), false);
});

test("streamNotifications sets SSE headers and cleans up on connection close", () => {
  const headers = {};
  const chunks = [];
  const req = new EventEmitter();
  req.user = { id: 999 };

  const res = {
    setHeader(k, v) {
      headers[k] = v;
    },
    flushHeaders() {},
    write(chunk) {
      chunks.push(chunk);
    },
  };

  notificationController.streamNotifications(req, res);
  assert.equal(headers["Content-Type"], "text/event-stream");
  assert.equal(headers["Connection"], "keep-alive");
  assert.ok(chunks.some((c) => c.includes(": connected")));

  // Trigger close to clear heartbeat timer so process exits cleanly
  req.emit("close");
});

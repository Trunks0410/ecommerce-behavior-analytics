import test from "node:test";
import assert from "node:assert/strict";
import EventEmitter from "node:events";
import notificationController from "../src/modules/notification/notification.controller.js";

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

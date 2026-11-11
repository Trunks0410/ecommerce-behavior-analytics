import test from "node:test";
import assert from "node:assert/strict";
import { assertShipmentTransition, isActiveShipmentStatus } from "../src/domain/state-machine.js";

test("shipment lifecycle allows each expected delivery action", () => {
  const transitions = [
    ["PENDING_ASSIGNMENT", "ASSIGNED", "SYSTEM"],
    ["ASSIGNED", "ACCEPTED", "SHIPPER"],
    ["ACCEPTED", "PICKED_UP", "SHIPPER"],
    ["PICKED_UP", "IN_TRANSIT", "SHIPPER"],
    ["IN_TRANSIT", "OUT_FOR_DELIVERY", "SHIPPER"],
    ["OUT_FOR_DELIVERY", "DELIVERED", "SHIPPER"],
    ["OUT_FOR_DELIVERY", "DELIVERY_FAILED", "SHIPPER"],
    ["DELIVERY_FAILED", "ASSIGNED", "SYSTEM"],
    ["DELIVERY_FAILED", "PENDING_ASSIGNMENT", "SYSTEM"],
    ["DELIVERY_FAILED", "RETURNED", "SYSTEM"],
  ];

  for (const [from, to, actor] of transitions) {
    assert.doesNotThrow(() => assertShipmentTransition(from, to, actor), `${from} -> ${to}`);
  }
});

test("shipment lifecycle rejects skipped or unauthorized transitions", () => {
  assert.throws(
    () => assertShipmentTransition("ASSIGNED", "DELIVERED", "SHIPPER"),
    { code: "INVALID_TRANSITION", status: 409 },
  );
  assert.throws(
    () => assertShipmentTransition("PENDING_ASSIGNMENT", "ASSIGNED", "SHIPPER"),
    { code: "FORBIDDEN_TRANSITION", status: 403 },
  );
});

test("only non-terminal shipments count as active", () => {
  assert.equal(isActiveShipmentStatus("IN_TRANSIT"), true);
  assert.equal(isActiveShipmentStatus("DELIVERED"), false);
  assert.equal(isActiveShipmentStatus("RETURNED"), false);
  assert.equal(isActiveShipmentStatus("CANCELLED"), false);
});

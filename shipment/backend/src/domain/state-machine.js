import { ServiceError } from "./errors.js";

export const SHIPMENT_TRANSITIONS = Object.freeze({
  PENDING_ASSIGNMENT: { ASSIGNED: ["SYSTEM", "ADMIN"] },
  ASSIGNED: { ACCEPTED: ["SHIPPER", "ADMIN"], PENDING_ASSIGNMENT: ["ADMIN"] },
  ACCEPTED: { PICKED_UP: ["SHIPPER", "ADMIN"] },
  PICKED_UP: { IN_TRANSIT: ["SHIPPER", "ADMIN"] },
  IN_TRANSIT: { OUT_FOR_DELIVERY: ["SHIPPER", "ADMIN"] },
  OUT_FOR_DELIVERY: { DELIVERED: ["SHIPPER", "ADMIN"], DELIVERY_FAILED: ["SHIPPER", "ADMIN"] },
  DELIVERY_FAILED: { ASSIGNED: ["SYSTEM", "ADMIN"], PENDING_ASSIGNMENT: ["SYSTEM", "ADMIN"], RETURNED: ["SYSTEM", "ADMIN"] },
  DELIVERED: {},
  RETURNED: {},
  CANCELLED: {},
});

export const assertShipmentTransition = (from, to, actorType) => {
  const actors = SHIPMENT_TRANSITIONS[from]?.[to];
  if (!actors) {
    throw new ServiceError(409, "INVALID_TRANSITION", `Shipment cannot move from ${from} to ${to}.`);
  }
  if (!actors.includes(actorType)) {
    throw new ServiceError(403, "FORBIDDEN_TRANSITION", `${actorType} cannot move shipment from ${from} to ${to}.`);
  }
};

export const isActiveShipmentStatus = (status) =>
  !["DELIVERED", "RETURNED", "CANCELLED"].includes(status);

import { randomBytes } from "node:crypto";
import { Op, UniqueConstraintError } from "sequelize";
import sequelize from "../db/sequelize.js";
import { Agent, DeliveryAttempt, Shipment, ShipmentEvent } from "../db/models.js";
import { rankAgents } from "../domain/dispatch.js";
import { ServiceError } from "../domain/errors.js";
import { assertShipmentTransition, isActiveShipmentStatus } from "../domain/state-machine.js";

const MAX_DELIVERY_ATTEMPTS = 3;
const ACTIVE_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
];

const cleanOptionalText = (value, maxLength) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new ServiceError(400, "VALIDATION_FAILED", `Text value must be at most ${maxLength} characters.`);
  }
  return value.trim();
};

const requireText = (value, field, maxLength = 500) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new ServiceError(400, "VALIDATION_FAILED", `${field} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
};

const parseMoney = (value, field, defaultValue = 0) => {
  const amount = value === undefined || value === null ? defaultValue : Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999999.99) {
    throw new ServiceError(400, "VALIDATION_FAILED", `${field} must be a non-negative amount.`);
  }
  return amount;
};

const statusTitle = {
  PENDING_ASSIGNMENT: "Vận đơn đang chờ phân công",
  ASSIGNED: "Đã phân công shipper",
  ACCEPTED: "Shipper đã nhận đơn",
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Đang vận chuyển",
  OUT_FOR_DELIVERY: "Đang giao đến người nhận",
  DELIVERED: "Giao hàng thành công",
  DELIVERY_FAILED: "Giao hàng thất bại",
  RETURNED: "Đơn hàng được chuyển hoàn",
  CANCELLED: "Vận đơn đã hủy",
};

const addEvent = (shipment, fromStatus, toStatus, actorType, actorId, note = null, proofImageUrl = null, transaction) =>
  ShipmentEvent.create(
    {
      shipmentId: shipment.id,
      fromStatus,
      toStatus,
      title: statusTitle[toStatus],
      note,
      actorType,
      actorId,
      proofImageUrl,
    },
    { transaction },
  );

const loadShipment = (id, transaction, lock = false) =>
  Shipment.findByPk(id, {
    include: [
      { model: Agent, as: "agent", attributes: ["id", "fullName", "phone", "avatarUrl", "rating"] },
      { model: ShipmentEvent, as: "events" },
      { model: DeliveryAttempt, as: "attempts" },
    ],
    order: [[{ model: ShipmentEvent, as: "events" }, "createdAt", "ASC"]],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });

async function assignAvailableAgent(shipment, transaction, excludedAgentIds = []) {
  const agents = await Agent.findAll({
    where: { role: "SHIPPER", accountStatus: "ACTIVE", availability: "AVAILABLE" },
    order: [["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (agents.length === 0) return null;

  const activeShipments = await Shipment.findAll({
    attributes: ["agentId"],
    where: { agentId: agents.map((agent) => agent.id), status: { [Op.in]: ACTIVE_STATUSES } },
    transaction,
  });
  const activeCountByAgent = new Map();
  for (const active of activeShipments) {
    const id = Number(active.agentId);
    activeCountByAgent.set(id, (activeCountByAgent.get(id) || 0) + 1);
  }

  const [selected] = rankAgents(agents, {
    pickupArea: shipment.pickupArea,
    excludedAgentIds,
    activeCountByAgent,
  });
  if (!selected) return null;

  const previousStatus = shipment.status;
  assertShipmentTransition(previousStatus, "ASSIGNED", "SYSTEM");
  await selected.update({ availability: "BUSY" }, { transaction });
  await shipment.update({ status: "ASSIGNED", agentId: selected.id, assignedAt: new Date() }, { transaction });
  await addEvent(shipment, previousStatus, "ASSIGNED", "SYSTEM", null, null, null, transaction);
  return selected;
}

async function dispatchPendingShipments(transaction) {
  const pending = await Shipment.findAll({
    where: { status: "PENDING_ASSIGNMENT" },
    order: [["createdAt", "ASC"], ["id", "ASC"]],
    limit: 50,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  for (const shipment of pending) {
    const assigned = await assignAvailableAgent(shipment, transaction);
    if (!assigned) break;
  }
}

export async function createShipment(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ServiceError(400, "VALIDATION_FAILED", "A shipment request body is required.");
  }

  const payload = {
    orderReference: requireText(input.orderReference, "orderReference", 100),
    pickupName: requireText(input.pickupName, "pickupName", 160),
    pickupPhone: requireText(input.pickupPhone, "pickupPhone", 30),
    pickupAddress: requireText(input.pickupAddress, "pickupAddress"),
    pickupArea: cleanOptionalText(input.pickupArea, 120),
    recipientName: requireText(input.recipientName, "recipientName", 160),
    recipientPhone: requireText(input.recipientPhone, "recipientPhone", 30),
    recipientAddress: requireText(input.recipientAddress, "recipientAddress"),
    deliveryNote: cleanOptionalText(input.deliveryNote, 1000),
    paymentMethod: input.paymentMethod === "COD" ? "COD" : input.paymentMethod === undefined ? "PREPAID" : input.paymentMethod,
    codAmount: parseMoney(input.codAmount, "codAmount"),
    shippingFee: parseMoney(input.shippingFee, "shippingFee"),
  };
  if (!["COD", "PREPAID"].includes(payload.paymentMethod)) {
    throw new ServiceError(400, "VALIDATION_FAILED", "paymentMethod must be COD or PREPAID.");
  }
  if (payload.paymentMethod === "PREPAID" && payload.codAmount !== 0) {
    throw new ServiceError(400, "VALIDATION_FAILED", "Prepaid shipments cannot have a COD amount.");
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = await Shipment.findOne({
        where: { orderReference: payload.orderReference },
        include: [{ model: Agent, as: "agent", attributes: ["id", "fullName", "phone", "avatarUrl", "rating"] }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) return { shipment: existing, created: false };

      const shipment = await Shipment.create(
        {
          ...payload,
          trackingNumber: `UTE${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`,
          providerCode: "UTE_EXPRESS",
          status: "PENDING_ASSIGNMENT",
        },
        { transaction },
      );
      await addEvent(shipment, null, "PENDING_ASSIGNMENT", "SYSTEM", null, "UTE Express đã tiếp nhận yêu cầu giao hàng.", null, transaction);
      const assignedAgent = await assignAvailableAgent(shipment, transaction);
      await shipment.reload({
        include: [{ model: Agent, as: "agent", attributes: ["id", "fullName", "phone", "avatarUrl", "rating"] }],
        transaction,
      });
      return { shipment, created: true, assigned: Boolean(assignedAgent) };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const shipment = await Shipment.findOne({
        where: { orderReference: payload.orderReference },
        include: [{ model: Agent, as: "agent", attributes: ["id", "fullName", "phone", "avatarUrl", "rating"] }],
      });
      if (shipment) return { shipment, created: false };
    }
    throw error;
  }
}

export async function getShipmentById(id, { includeAttempts = false } = {}) {
  const shipment = await loadShipment(id);
  if (!shipment) throw new ServiceError(404, "SHIPMENT_NOT_FOUND", "Không tìm thấy vận đơn.");
  if (!includeAttempts) shipment.attempts = undefined;
  return shipment;
}

export async function getShipmentByOrderReference(orderReference) {
  const shipment = await Shipment.findOne({
    where: { orderReference },
    include: [
      { model: Agent, as: "agent", attributes: ["id", "fullName", "phone", "avatarUrl", "rating"] },
      { model: ShipmentEvent, as: "events", attributes: ["fromStatus", "toStatus", "title", "note", "proofImageUrl", "createdAt"], separate: true, order: [["createdAt", "ASC"]] },
    ],
  });
  if (!shipment) throw new ServiceError(404, "SHIPMENT_NOT_FOUND", "Không tìm thấy vận đơn.");
  return shipment;
}

export async function getShipmentByTrackingNumber(trackingNumber) {
  const shipment = await Shipment.findOne({
    where: { trackingNumber },
    attributes: ["trackingNumber", "status", "createdAt", "updatedAt", "deliveredAt"],
    include: [{
      model: ShipmentEvent,
      as: "events",
      attributes: ["toStatus", "title", "note", "createdAt"],
      separate: true,
      order: [["createdAt", "ASC"]],
    }],
  });
  if (!shipment) throw new ServiceError(404, "SHIPMENT_NOT_FOUND", "Không tìm thấy vận đơn.");
  return shipment;
}

export async function listShipments({ agentId, status, search, page = 1, limit = 50 } = {}) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));
  const where = {};
  if (agentId) where.agentId = agentId;
  if (status) where.status = status;
  if (search?.trim()) {
    where[Op.or] = [
      { trackingNumber: { [Op.like]: `%${search.trim()}%` } },
      { orderReference: { [Op.like]: `%${search.trim()}%` } },
      { recipientName: { [Op.like]: `%${search.trim()}%` } },
    ];
  }

  const result = await Shipment.findAndCountAll({
    where,
    include: [
      { model: Agent, as: "agent", attributes: ["id", "fullName", "phone", "avatarUrl"] },
      { model: ShipmentEvent, as: "events", separate: true, order: [["createdAt", "ASC"]] },
    ],
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    distinct: true,
  });
  return {
    total: result.count,
    totalPages: Math.ceil(result.count / safeLimit),
    currentPage: safePage,
    shipments: result.rows,
  };
}

const actionTargets = {
  accept: "ACCEPTED",
  pickup: "PICKED_UP",
  start: "IN_TRANSIT",
  outForDelivery: "OUT_FOR_DELIVERY",
  complete: "DELIVERED",
};

export async function transitionShipment(id, action, actor, input = {}) {
  const targetStatus = actionTargets[action];
  if (!targetStatus && action !== "fail") {
    throw new ServiceError(404, "ACTION_NOT_FOUND", "Unknown shipment action.");
  }

  return sequelize.transaction(async (transaction) => {
    const shipment = await Shipment.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!shipment) throw new ServiceError(404, "SHIPMENT_NOT_FOUND", "Không tìm thấy vận đơn.");
    if (actor.role === "SHIPPER" && Number(shipment.agentId) !== Number(actor.id)) {
      throw new ServiceError(403, "FORBIDDEN", "Bạn không được phân công vận đơn này.");
    }

    if (action === "fail") {
      const reason = requireText(input.reason, "reason", 1000);
      assertShipmentTransition(shipment.status, "DELIVERY_FAILED", actor.role);
      const fromStatus = shipment.status;
      const now = new Date();
      await shipment.update({
        status: "DELIVERY_FAILED",
        lastFailureReason: reason,
      }, { transaction });
      await DeliveryAttempt.update(
        { result: "FAILED", failureReason: reason, completedAt: now },
        { where: { shipmentId: shipment.id, result: "IN_PROGRESS" }, transaction },
      );
      await addEvent(shipment, fromStatus, "DELIVERY_FAILED", actor.role, actor.id, reason, null, transaction);

      const failedAgentId = shipment.agentId;
      if (failedAgentId) {
        await Agent.update({ availability: "AVAILABLE" }, { where: { id: failedAgentId }, transaction });
      }

      if (shipment.attemptCount >= MAX_DELIVERY_ATTEMPTS) {
        assertShipmentTransition("DELIVERY_FAILED", "RETURNED", "SYSTEM");
        await shipment.update({ status: "RETURNED", agentId: null }, { transaction });
        await addEvent(shipment, "DELIVERY_FAILED", "RETURNED", "SYSTEM", null, "Đã vượt quá số lần giao cho phép.", null, transaction);
      } else {
        const attempted = await DeliveryAttempt.findAll({
          where: { shipmentId: shipment.id },
          attributes: ["agentId"],
          transaction,
        });
        const selected = await assignAvailableAgent(
          shipment,
          transaction,
          attempted.map((attempt) => attempt.agentId),
        );
        if (!selected) {
          assertShipmentTransition("DELIVERY_FAILED", "PENDING_ASSIGNMENT", "SYSTEM");
          await shipment.update({ status: "PENDING_ASSIGNMENT", agentId: null }, { transaction });
          await addEvent(shipment, "DELIVERY_FAILED", "PENDING_ASSIGNMENT", "SYSTEM", null, "Đang chờ shipper khác nhận giao lại.", null, transaction);
        }
      }
    } else {
      assertShipmentTransition(shipment.status, targetStatus, actor.role);
      const fromStatus = shipment.status;
      const note = cleanOptionalText(input.note, 1000);
      const proofImageUrl = cleanOptionalText(input.proofImageUrl, 1000);
      if (targetStatus === "DELIVERED" && !proofImageUrl) {
        throw new ServiceError(400, "VALIDATION_FAILED", "Cần ảnh bằng chứng giao hàng thành công.");
      }

      const updates = { status: targetStatus };
      if (targetStatus === "DELIVERED") {
        updates.deliveredAt = new Date();
      }
      await shipment.update(updates, { transaction });
      await addEvent(shipment, fromStatus, targetStatus, actor.role, actor.id, note, proofImageUrl, transaction);

      if (targetStatus === "ACCEPTED") {
        await DeliveryAttempt.create({
          shipmentId: shipment.id,
          attemptNumber: shipment.attemptCount + 1,
          agentId: actor.id,
          result: "IN_PROGRESS",
          startedAt: new Date(),
        }, { transaction });
        await shipment.update({ attemptCount: shipment.attemptCount + 1 }, { transaction });
      }
      if (targetStatus === "DELIVERED") {
        await DeliveryAttempt.update(
          { result: "DELIVERED", completedAt: new Date() },
          { where: { shipmentId: shipment.id, result: "IN_PROGRESS" }, transaction },
        );
        await Agent.increment("completedDeliveries", { by: 1, where: { id: shipment.agentId }, transaction });
        await Agent.update({ availability: "AVAILABLE" }, { where: { id: shipment.agentId }, transaction });
        await dispatchPendingShipments(transaction);
      }
    }

    return loadShipment(shipment.id, transaction);
  });
}

export async function updateAgentAvailability(agentId, availability) {
  if (!["AVAILABLE", "OFFLINE"].includes(availability)) {
    throw new ServiceError(400, "VALIDATION_FAILED", "Availability must be AVAILABLE or OFFLINE.");
  }
  const agent = await Agent.findByPk(agentId);
  if (!agent || agent.role !== "SHIPPER") throw new ServiceError(404, "AGENT_NOT_FOUND", "Không tìm thấy shipper.");
  if (availability === "OFFLINE" && agent.availability === "BUSY") {
    throw new ServiceError(409, "AGENT_HAS_ACTIVE_SHIPMENT", "Hoàn tất vận đơn đang giao trước khi chuyển offline.");
  }
  return sequelize.transaction(async (transaction) => {
    await agent.update({ availability }, { transaction });
    if (availability === "AVAILABLE") await dispatchPendingShipments(transaction);
    return agent;
  });
}

export async function listAgents() {
  return Agent.findAll({
    where: { role: "SHIPPER" },
    attributes: ["id", "email", "phone", "fullName", "avatarUrl", "availability", "serviceAreas", "rating", "completedDeliveries"],
    order: [["fullName", "ASC"]],
  });
}

export async function setAgentAvailabilityAfterTerminalTransition(shipment, transaction) {
  if (shipment.agentId && !isActiveShipmentStatus(shipment.status)) {
    await Agent.update({ availability: "AVAILABLE" }, { where: { id: shipment.agentId }, transaction });
  }
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { Agent, Shipment } from "../db/models.js";
import { ServiceError } from "../domain/errors.js";
import { listShipments, updateAgentAvailability } from "./shipment.service.js";

const getAccessTokenSecret = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new ServiceError(500, "AUTH_CONFIGURATION_ERROR", "ACCESS_TOKEN_SECRET must contain at least 32 characters.");
  }
  return secret;
};

const toPublicAgent = (agent) => ({
  id: agent.id,
  email: agent.email,
  phone: agent.phone,
  role: agent.role,
  full_name: agent.fullName,
  avatar_url: agent.avatarUrl,
  operating_areas: agent.serviceAreas || [],
  availability: agent.availability,
  rating: Number(agent.rating),
  completed_deliveries: agent.completedDeliveries,
});

export async function login(emailOrPhone, password) {
  if (typeof emailOrPhone !== "string" || typeof password !== "string" || !password) {
    throw new ServiceError(400, "VALIDATION_FAILED", "Vui lòng nhập email/số điện thoại và mật khẩu.");
  }
  const agent = await Agent.findOne({
    where: { [Op.or]: [{ email: emailOrPhone.trim().toLowerCase() }, { phone: emailOrPhone.trim() }] },
  });
  if (!agent || agent.accountStatus !== "ACTIVE" || !(await bcrypt.compare(password, agent.passwordHash))) {
    throw new ServiceError(401, "INVALID_CREDENTIALS", "Thông tin đăng nhập không chính xác hoặc tài khoản đã bị khóa.");
  }

  const accessToken = jwt.sign(
    { id: agent.id, role: agent.role },
    getAccessTokenSecret(),
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "8h", issuer: "ute-express" },
  );
  return { user: toPublicAgent(agent), accessToken };
}

export async function getProfile(agentId) {
  const agent = await Agent.findByPk(agentId);
  if (!agent || agent.accountStatus !== "ACTIVE") throw new ServiceError(404, "AGENT_NOT_FOUND", "Không tìm thấy tài khoản.");
  return toPublicAgent(agent);
}

export async function updateProfile(agentId, input) {
  const agent = await Agent.findByPk(agentId);
  if (!agent || agent.accountStatus !== "ACTIVE") throw new ServiceError(404, "AGENT_NOT_FOUND", "Không tìm thấy tài khoản.");

  const updates = {};
  if (input.full_name !== undefined) {
    if (typeof input.full_name !== "string" || !input.full_name.trim() || input.full_name.trim().length > 160) {
      throw new ServiceError(400, "VALIDATION_FAILED", "Tên hiển thị không hợp lệ.");
    }
    updates.fullName = input.full_name.trim();
  }
  if (input.phone !== undefined) {
    if (typeof input.phone !== "string" || input.phone.length > 30) {
      throw new ServiceError(400, "VALIDATION_FAILED", "Số điện thoại không hợp lệ.");
    }
    updates.phone = input.phone.trim() || null;
  }
  if (input.avatar_url !== undefined) {
    if (input.avatar_url !== null && (typeof input.avatar_url !== "string" || input.avatar_url.length > 1000)) {
      throw new ServiceError(400, "VALIDATION_FAILED", "Ảnh đại diện không hợp lệ.");
    }
    updates.avatarUrl = input.avatar_url || null;
  }
  if (input.operating_areas !== undefined) {
    if (!Array.isArray(input.operating_areas) || input.operating_areas.some((area) => typeof area !== "string" || area.length > 120)) {
      throw new ServiceError(400, "VALIDATION_FAILED", "Khu vực hoạt động không hợp lệ.");
    }
    updates.serviceAreas = [...new Set(input.operating_areas.map((area) => area.trim()).filter(Boolean))];
  }
  if (input.availability !== undefined) {
    const updated = await updateAgentAvailability(agentId, input.availability);
    return toPublicAgent(updated);
  }
  await agent.update(updates);
  return toPublicAgent(agent);
}

export async function getShipperShipments(agentId, { page, limit, status, search } = {}) {
  const result = await listShipments({ agentId, page, limit, status, search });
  return {
    total: result.total,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    orders: result.shipments.map((shipment) => ({
      id: shipment.id,
      shop_order_code: shipment.orderReference,
      status: shipment.status,
      subtotal: 0,
      shipping_fee: Number(shipment.shippingFee),
      discount_amount: 0,
      final_amount: Number(shipment.codAmount),
      cod_status: shipment.paymentMethod === "COD" && shipment.status === "DELIVERED" ? "COLLECTED" : "PENDING",
      cod_amount_collected: shipment.paymentMethod === "COD" && shipment.status === "DELIVERED" ? Number(shipment.codAmount) : null,
      delivery_attempts: shipment.attemptCount,
      parent_order_id: shipment.orderReference,
      created_at: shipment.createdAt,
      updated_at: shipment.updatedAt,
      shipment: {
        id: shipment.id,
        shop_order_id: shipment.orderReference,
        shipper_id: shipment.agentId,
        tracking_number: shipment.trackingNumber,
        status: shipment.status,
        shipping_fee: Number(shipment.shippingFee),
        histories: shipment.events.map((event) => ({
          id: event.id,
          shipment_id: event.shipmentId,
          status: event.toStatus,
          note: event.note,
          proof_image_url: event.proofImageUrl,
          created_at: event.createdAt,
        })),
      },
      parentOrder: {
        id: shipment.orderReference,
        checkout_code: shipment.orderReference,
        payment_method: shipment.paymentMethod,
        shipping_address: {
          recipient_name: shipment.recipientName,
          phone_number: shipment.recipientPhone,
          address_line: shipment.recipientAddress,
        },
      },
      shop: {
        shop_name: shipment.pickupName,
        pickup_address: shipment.pickupAddress,
      },
      recipient_name: shipment.recipientName,
      recipient_phone: shipment.recipientPhone,
      recipient_address: shipment.recipientAddress,
      payment_method: shipment.paymentMethod,
      cod_amount: Number(shipment.codAmount),
    })),
  };
}

export async function getCollectedCOD(agentId) {
  return Shipment.findAll({
    where: { agentId, paymentMethod: "COD", status: "DELIVERED" },
    attributes: ["id", "trackingNumber", "orderReference", "codAmount", "deliveredAt"],
    order: [["deliveredAt", "DESC"]],
  });
}

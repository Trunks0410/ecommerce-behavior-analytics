import { DataTypes } from "sequelize";
import sequelize from "./sequelize.js";

export const Agent = sequelize.define(
  "Agent",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    phone: { type: DataTypes.STRING(30), allowNull: true, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: "password_hash" },
    fullName: { type: DataTypes.STRING(160), allowNull: false, field: "full_name" },
    avatarUrl: { type: DataTypes.STRING(1000), allowNull: true, field: "avatar_url" },
    role: { type: DataTypes.ENUM("ADMIN", "SHIPPER"), allowNull: false, defaultValue: "SHIPPER" },
    accountStatus: {
      type: DataTypes.ENUM("ACTIVE", "LOCKED"),
      allowNull: false,
      defaultValue: "ACTIVE",
      field: "account_status",
    },
    availability: {
      type: DataTypes.ENUM("AVAILABLE", "BUSY", "OFFLINE"),
      allowNull: false,
      defaultValue: "AVAILABLE",
    },
    serviceAreas: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: "service_areas" },
    rating: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 5.0 },
    completedDeliveries: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: "completed_deliveries",
    },
  },
  { tableName: "agents", indexes: [{ fields: ["role", "availability", "account_status"] }] },
);

export const Shipment = sequelize.define(
  "Shipment",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    trackingNumber: { type: DataTypes.STRING(40), allowNull: false, unique: true, field: "tracking_number" },
    orderReference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "order_reference",
    },
    providerCode: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "UTE_EXPRESS", field: "provider_code" },
    status: {
      type: DataTypes.ENUM(
        "PENDING_ASSIGNMENT",
        "ASSIGNED",
        "ACCEPTED",
        "PICKED_UP",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "DELIVERY_FAILED",
        "RETURNED",
        "CANCELLED",
      ),
      allowNull: false,
      defaultValue: "PENDING_ASSIGNMENT",
    },
    pickupName: { type: DataTypes.STRING(160), allowNull: false, field: "pickup_name" },
    pickupPhone: { type: DataTypes.STRING(30), allowNull: false, field: "pickup_phone" },
    pickupAddress: { type: DataTypes.STRING(500), allowNull: false, field: "pickup_address" },
    pickupArea: { type: DataTypes.STRING(120), allowNull: true, field: "pickup_area" },
    recipientName: { type: DataTypes.STRING(160), allowNull: false, field: "recipient_name" },
    recipientPhone: { type: DataTypes.STRING(30), allowNull: false, field: "recipient_phone" },
    recipientAddress: { type: DataTypes.STRING(500), allowNull: false, field: "recipient_address" },
    deliveryNote: { type: DataTypes.STRING(1000), allowNull: true, field: "delivery_note" },
    paymentMethod: {
      type: DataTypes.ENUM("PREPAID", "COD"),
      allowNull: false,
      defaultValue: "PREPAID",
      field: "payment_method",
    },
    codAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: "cod_amount" },
    shippingFee: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: "shipping_fee" },
    agentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "agent_id",
      references: { model: "agents", key: "id" },
    },
    attemptCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: "attempt_count" },
    lastFailureReason: { type: DataTypes.STRING(1000), allowNull: true, field: "last_failure_reason" },
    proofImageUrl: { type: DataTypes.STRING(1000), allowNull: true, field: "proof_image_url" },
    assignedAt: { type: DataTypes.DATE, allowNull: true, field: "assigned_at" },
    deliveredAt: { type: DataTypes.DATE, allowNull: true, field: "delivered_at" },
  },
  {
    tableName: "shipments",
    indexes: [
      { fields: ["status", "created_at"] },
      { fields: ["agent_id", "status"] },
    ],
  },
);

export const DeliveryAttempt = sequelize.define(
  "DeliveryAttempt",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    shipmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "shipment_id",
      references: { model: "shipments", key: "id" },
    },
    attemptNumber: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "attempt_number" },
    agentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "agent_id",
      references: { model: "agents", key: "id" },
    },
    result: { type: DataTypes.ENUM("IN_PROGRESS", "DELIVERED", "FAILED"), allowNull: false },
    failureReason: { type: DataTypes.STRING(1000), allowNull: true, field: "failure_reason" },
    startedAt: { type: DataTypes.DATE, allowNull: false, field: "started_at" },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: "completed_at" },
  },
  {
    tableName: "delivery_attempts",
    createdAt: false,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["shipment_id", "attempt_number"] }],
  },
);

export const ShipmentEvent = sequelize.define(
  "ShipmentEvent",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    shipmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "shipment_id",
      references: { model: "shipments", key: "id" },
    },
    fromStatus: { type: DataTypes.STRING(40), allowNull: true, field: "from_status" },
    toStatus: { type: DataTypes.STRING(40), allowNull: false, field: "to_status" },
    title: { type: DataTypes.STRING(160), allowNull: false },
    note: { type: DataTypes.STRING(1000), allowNull: true },
    actorType: { type: DataTypes.ENUM("SYSTEM", "ADMIN", "SHIPPER"), allowNull: false, field: "actor_type" },
    actorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "actor_id" },
    proofImageUrl: { type: DataTypes.STRING(1000), allowNull: true, field: "proof_image_url" },
  },
  { tableName: "shipment_events", updatedAt: false, indexes: [{ fields: ["shipment_id", "created_at"] }] },
);

Agent.hasMany(Shipment, { foreignKey: "agentId", as: "shipments" });
Shipment.belongsTo(Agent, { foreignKey: "agentId", as: "agent" });
Shipment.hasMany(ShipmentEvent, { foreignKey: "shipmentId", as: "events" });
ShipmentEvent.belongsTo(Shipment, { foreignKey: "shipmentId", as: "shipment" });
Shipment.hasMany(DeliveryAttempt, { foreignKey: "shipmentId", as: "attempts" });
DeliveryAttempt.belongsTo(Shipment, { foreignKey: "shipmentId", as: "shipment" });
Agent.hasMany(DeliveryAttempt, { foreignKey: "agentId", as: "deliveryAttempts" });
DeliveryAttempt.belongsTo(Agent, { foreignKey: "agentId", as: "agent" });

export default { Agent, Shipment, ShipmentEvent, DeliveryAttempt };

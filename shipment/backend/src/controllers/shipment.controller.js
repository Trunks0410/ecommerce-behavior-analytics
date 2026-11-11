import { ServiceError } from "../domain/errors.js";
import {
  createShipment,
  getShipmentById,
  getShipmentByOrderReference,
  getShipmentByTrackingNumber,
  listAgents,
  listShipments,
  transitionShipment,
} from "../services/shipment.service.js";

const respond = (res, status, data, message = "Success") =>
  res.status(status).json({ message, data });

const handleError = (res, error) => {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  console.error("UTE Express request failed:", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Đã xảy ra lỗi hệ thống." });
};

const create = async (req, res) => {
  try {
    const result = await createShipment(req.body);
    return respond(res, result.created ? 201 : 200, result.shipment, result.created ? "Đã tạo vận đơn." : "Vận đơn đã tồn tại.");
  } catch (error) {
    return handleError(res, error);
  }
};

const getByOrderReference = async (req, res) => {
  try {
    return respond(res, 200, await getShipmentByOrderReference(req.params.orderReference));
  } catch (error) {
    return handleError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const shipment = await getShipmentById(req.params.id, { includeAttempts: true });
    if (req.user.role === "SHIPPER" && Number(shipment.agentId) !== Number(req.user.id)) {
      return res.status(404).json({ code: "SHIPMENT_NOT_FOUND", message: "Không tìm thấy vận đơn." });
    }
    return respond(res, 200, shipment);
  } catch (error) {
    return handleError(res, error);
  }
};

const getTracking = async (req, res) => {
  try {
    return respond(res, 200, await getShipmentByTrackingNumber(req.params.trackingNumber));
  } catch (error) {
    return handleError(res, error);
  }
};

const getShipments = async (req, res) => {
  try {
    const result = await listShipments(req.query);
    return respond(res, 200, result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAgents = async (_req, res) => {
  try {
    return respond(res, 200, await listAgents());
  } catch (error) {
    return handleError(res, error);
  }
};

const runAction = (action) => async (req, res) => {
  try {
    const shipment = await transitionShipment(req.params.id, action, req.user, req.body);
    return respond(res, 200, shipment, "Đã cập nhật vận đơn.");
  } catch (error) {
    return handleError(res, error);
  }
};

export default {
  create,
  getByOrderReference,
  getById,
  getTracking,
  getShipments,
  getAgents,
  accept: runAction("accept"),
  pickup: runAction("pickup"),
  start: runAction("start"),
  outForDelivery: runAction("outForDelivery"),
  complete: runAction("complete"),
  fail: runAction("fail"),
};

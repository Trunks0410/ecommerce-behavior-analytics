import { ServiceError } from "../domain/errors.js";
import {
  getCollectedCOD,
  getProfile,
  getShipperShipments,
  login,
  updateProfile,
} from "../services/shipper.service.js";

const handleError = (res, error) => {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ code: "DUPLICATE_VALUE", message: "Email hoặc số điện thoại đã được sử dụng." });
  }
  console.error("UTE Express shipper request failed:", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Đã xảy ra lỗi hệ thống." });
};

const loginAction = async (req, res) => {
  try {
    const result = await login(req.body.email_or_phone, req.body.password);
    return res.status(200).json({ message: "Đăng nhập thành công", data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getProfileAction = async (req, res) => {
  try {
    return res.status(200).json({ message: "Success", data: await getProfile(req.user.id) });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateProfileAction = async (req, res) => {
  try {
    return res.status(200).json({ message: "Đã cập nhật hồ sơ.", data: await updateProfile(req.user.id, req.body) });
  } catch (error) {
    return handleError(res, error);
  }
};

const getShipmentsAction = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Success",
      data: await getShipperShipments(req.user.id, req.query),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCollectedCODAction = async (req, res) => {
  try {
    const shipments = await getCollectedCOD(req.user.id);
    return res.status(200).json({ message: "Success", data: shipments });
  } catch (error) {
    return handleError(res, error);
  }
};

const uploadImages = async (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ code: "VALIDATION_FAILED", message: "Không có file nào được tải lên." });
  }
  const urls = req.files.map((file) =>
    file.path?.startsWith("http://") || file.path?.startsWith("https://")
      ? file.path
      : `/uploads/${file.filename}`,
  );
  return res.status(200).json({ message: "Upload ảnh thành công", data: urls });
};

export default {
  login: loginAction,
  getProfile: getProfileAction,
  updateProfile: updateProfileAction,
  getShipperOrders: getShipmentsAction,
  getCollectedCOD: getCollectedCODAction,
  uploadImages,
};

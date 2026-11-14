import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { Agent } from "../db/models.js";

const getTokenSecret = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("ACCESS_TOKEN_SECRET must contain at least 32 characters.");
  return secret;
};

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập để tiếp tục." });

  try {
    const payload = jwt.verify(token, getTokenSecret(), { issuer: "ute-express" });
    const agent = await Agent.findByPk(payload.id);
    if (!agent || agent.accountStatus !== "ACTIVE") {
      return res.status(401).json({ code: "UNAUTHENTICATED", message: "Tài khoản không còn hoạt động." });
    }
    req.user = { id: agent.id, role: agent.role };
    req.currentUser = agent;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ code: "INVALID_TOKEN", message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }
    return next(error);
  }
};

export const isShipper = (req, res, next) => {
  if (!req.user || req.user.role !== "SHIPPER") {
    return res.status(403).json({ code: "FORBIDDEN", message: "Chức năng này chỉ dành cho shipper." });
  }
  return next();
};

export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ code: "FORBIDDEN", message: "Chức năng này chỉ dành cho quản trị viên UTE Express." });
  }
  return next();
};

export const verifyServiceKey = (req, res, next) => {
  const expected = process.env.ECOMMERCE_SERVICE_API_KEY;
  const provided = req.get("x-service-api-key");
  if (!expected || !provided) {
    return res.status(401).json({ code: "SERVICE_UNAUTHENTICATED", message: "Service authentication is required." });
  }
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(401).json({ code: "SERVICE_UNAUTHENTICATED", message: "Service authentication failed." });
  }
  return next();
};

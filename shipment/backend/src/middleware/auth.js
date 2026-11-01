import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../../../../Ecommerce-platform/backend/src/database/models/index.js";

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "fashion_marketplace_access_token_secret_key_2026";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Vui lòng đăng nhập để thực hiện" });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "accessToken jwt expired" });
      }
      return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
    req.user = user;
    next();
  });
};

export const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

export const isShipper = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Chưa xác thực người dùng" });
    }

    const user = await db.User.findByPk(req.user.id, {
      include: [{ model: db.Role, as: "role" }]
    });

    if (!user || !user.role) {
      return res.status(403).json({ message: "Không tìm thấy thông tin quyền hạn người dùng" });
    }

    const roleName = user.role.role_name.toLowerCase();
    if (roleName !== "shipper" && roleName !== "admin") {
      return res.status(403).json({ message: "Quyền truy cập bị từ chối. Chỉ dành cho Shipper hoặc Admin" });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error("Error in isShipper middleware:", error);
    return res.status(500).json({ message: "Lỗi kiểm tra quyền hạn shipper" });
  }
};

export default { verifyToken, optionalVerifyToken, isShipper };

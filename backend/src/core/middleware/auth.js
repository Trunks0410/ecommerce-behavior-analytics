import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../../database/models/index.js";
dotenv.config();

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Vui lòng đăng nhập để thực hiện" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "accessToken jwt expired" });
      }
      return res.status(401).json({ message: "Invalid or expired token" });
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

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

const checkRole = (allowedRoles) => async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      include: [{ model: db.Role, as: "role" }]
    });

    if (!user || !user.role || !allowedRoles.includes(user.role.role_name)) {
      return res.status(403).json({ message: `Quyền truy cập bị từ chối. Cần quyền: ${allowedRoles.join(", ")}` });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Lỗi kiểm tra quyền hạn" });
  }
};

export const isVendor = checkRole(["vendor"]);
export const isAdmin = checkRole(["admin"]);
export const isManager = checkRole(["admin", "manager"]);
export const isShipper = checkRole(["shipper"]);

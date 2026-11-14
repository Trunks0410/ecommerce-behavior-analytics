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
      include: [{ model: db.Role, as: "role" }],
    });

    if (!user || !user.role || !allowedRoles.includes(user.role.role_name)) {
      return res.status(403).json({
        message: `Quyền truy cập bị từ chối. Cần vai trò: ${allowedRoles.join(", ")}`,
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Lỗi kiểm tra vai trò người dùng" });
  }
};

/**
 * Hàm kiểm tra action có khớp với danh sách allowed actions không.
 * Hỗ trợ các wildcard AWS IAM:
 * - '*' khớp với mọi action
 * - 'service:*' khớp với mọi action của service đó (ví dụ: 'order:*' khớp với 'order:read', 'order:approve')
 * - 'service:action' khớp chính xác
 */
export const evaluateAction = (allowedActions, requiredAction) => {
  if (allowedActions.has("*")) return true;
  if (allowedActions.has(requiredAction)) return true;

  if (requiredAction.includes(":")) {
    const [service] = requiredAction.split(":");
    if (allowedActions.has(`${service}:*`)) return true;
  }
  return false;
};

/**
 * Lấy toàn bộ danh sách Effective Allowed Actions của 1 User
 * Effective Permissions = (Role Policies) UNION (Direct User Policies)
 */
export const getUserEffectiveActions = async (userId) => {
  const user = await db.User.findByPk(userId, {
    include: [
      {
        model: db.Role,
        as: "role",
        include: [
          {
            model: db.Policy,
            as: "policies",
            through: { attributes: [] },
          },
        ],
      },
      {
        model: db.Policy,
        as: "directPolicies",
        through: { attributes: [] },
      },
    ],
  });

  if (!user) return { user: null, isRootAdmin: false, actions: new Set(), policies: [] };

  // ĐẶC QUYỀN ROOT ADMIN: Luôn sở hữu toàn quyền AdministratorAccess ('*')
  if (user.role && user.role.role_name === "admin") {
    return {
      user,
      isRootAdmin: true,
      actions: new Set(["*"]),
      policies: [{ name: "AdministratorAccess", code: "ADMIN_FULL_ACCESS", actions: ["*"] }],
    };
  }

  const allowedActions = new Set();
  const appliedPolicies = [];

  // 1. Lấy actions từ Role Policies
  if (user.role && user.role.policies) {
    for (const policy of user.role.policies) {
      if (policy.effect === "ALLOW") {
        appliedPolicies.push({ source: `Role:${user.role.role_name}`, ...policy.toJSON() });
        const acts = Array.isArray(policy.actions)
          ? policy.actions
          : typeof policy.actions === "string"
          ? JSON.parse(policy.actions)
          : [];
        acts.forEach((a) => allowedActions.add(a));
      }
    }
  }

  // 2. Lấy actions từ Direct User Policies (Gán trực tiếp cho User)
  if (user.directPolicies) {
    for (const policy of user.directPolicies) {
      if (policy.effect === "ALLOW") {
        appliedPolicies.push({ source: "DirectUserPolicy", ...policy.toJSON() });
        const acts = Array.isArray(policy.actions)
          ? policy.actions
          : typeof policy.actions === "string"
          ? JSON.parse(policy.actions)
          : [];
        acts.forEach((a) => allowedActions.add(a));
      }
    }
  }

  return { user, isRootAdmin: false, actions: allowedActions, policies: appliedPolicies };
};

/**
 * IAM Policy Middleware: Kiểm tra quyền dựa trên Policy (PBAC)
 * Root Admin: Luôn cho qua mà không cần gán policy.
 * Custom Role / User: Phải có action trong Role Policies hoặc Direct Policies.
 */
export const requirePermission = (requiredAction) => async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để thực hiện" });
    }

    const { user, isRootAdmin, actions } = await getUserEffectiveActions(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }

    req.currentUser = user;

    // Root Admin luôn có quyền tối cao
    if (isRootAdmin) {
      return next();
    }

    // Kiểm tra action
    const hasPermission = evaluateAction(actions, requiredAction);
    if (!hasPermission) {
      return res.status(403).json({
        message: `Quyền truy cập bị từ chối. Yêu cầu quyền IAM: '${requiredAction}'`,
        required_permission: requiredAction,
      });
    }

    next();
  } catch (error) {
    console.error("IAM Authorization Error:", error);
    return res.status(500).json({ message: "Lỗi kiểm tra quyền hạn IAM" });
  }
};

/**
 * Middleware cho phép 1 trong nhiều permissions (OR)
 */
export const requireAnyPermission = (requiredActions = []) => async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để thực hiện" });
    }

    const { user, isRootAdmin, actions } = await getUserEffectiveActions(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }

    req.currentUser = user;

    if (isRootAdmin) return next();

    const hasAny = requiredActions.some((act) => evaluateAction(actions, act));
    if (!hasAny) {
      return res.status(403).json({
        message: `Quyền truy cập bị từ chối. Yêu cầu một trong các quyền IAM: ${requiredActions.join(", ")}`,
        required_permissions: requiredActions,
      });
    }

    next();
  } catch (error) {
    console.error("IAM Authorization Error:", error);
    return res.status(500).json({ message: "Lỗi kiểm tra quyền hạn IAM" });
  }
};

export const isVendor = checkRole(["vendor"]);
export const isAdmin = checkRole(["admin"]);
export const isShipper = checkRole(["shipper"]);

// isManager giờ đây hỗ trợ cả Root Admin và bất kỳ User nào có quyền quản trị/nhân viên
export const isManager = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để thực hiện" });
    }
    const { user, isRootAdmin, actions } = await getUserEffectiveActions(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }
    req.currentUser = user;

    // Cho phép Root Admin hoặc bất kỳ ai có ít nhất 1 quyền quản trị (khác rỗng)
    if (isRootAdmin || actions.size > 0 || user.role?.role_name === "manager") {
      return next();
    }

    return res.status(403).json({
      message: "Quyền truy cập bị từ chối. Bạn không có quyền quản trị hệ thống",
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi kiểm tra quyền hạn quản trị" });
  }
};

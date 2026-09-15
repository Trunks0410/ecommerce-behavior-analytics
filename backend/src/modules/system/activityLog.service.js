import db from "../../database/models/index.js";
import { Op } from "sequelize";

/**
 * Ghi nhận một nhật ký hoạt động vào database
 */
const logActivity = async ({
  userId = null,
  email = null,
  actionType,
  entityType = null,
  entityId = null,
  description,
  details = null,
  req = null,
}) => {
  try {
    let finalUserId = userId;
    let finalEmail = email;
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      // Tự động lấy thông tin từ request nếu có
      if (!finalUserId && req.user) {
        finalUserId = req.user.id;
      }
      if (!finalEmail && req.user) {
        finalEmail = req.user.email;
      }
      ipAddress = req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress || null;
      // Nếu có nhiều IP trong x-forwarded-for, chỉ lấy cái đầu tiên
      if (ipAddress && ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim();
      }
      userAgent = req.headers["user-agent"] || null;
    }

    let finalDetails = details;
    if (details && typeof details === "object") {
      finalDetails = JSON.stringify(details, null, 2);
    }

    await db.ActivityLog.create({
      user_id: finalUserId,
      email: finalEmail,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      description,
      details: finalDetails,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

/**
 * Lấy danh sách nhật ký hoạt động kèm phân trang, bộ lọc và tìm kiếm
 */
const getActivityLogs = async ({
  page = 1,
  limit = 20,
  actionType = "",
  entityType = "",
  search = "",
  fromDate = "",
  toDate = "",
}) => {
  const offset = (page - 1) * limit;
  const where = {};

  // Bộ lọc theo loại hành động
  if (actionType) {
    where.action_type = actionType;
  }

  // Bộ lọc theo loại đối tượng tác động
  if (entityType) {
    where.entity_type = entityType;
  }

  // Bộ lọc theo khoảng thời gian
  if (fromDate && toDate) {
    where.created_at = {
      [Op.between]: [new Date(fromDate), new Date(toDate + "T23:59:59.999Z")],
    };
  } else if (fromDate) {
    where.created_at = {
      [Op.gte]: new Date(fromDate),
    };
  } else if (toDate) {
    where.created_at = {
      [Op.lte]: new Date(toDate + "T23:59:59.999Z"),
    };
  }

  // Tìm kiếm theo từ khóa (mô tả, email, hoặc entity_id)
  if (search) {
    where[Op.or] = [
      { description: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { entity_id: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await db.ActivityLog.findAndCountAll({
    where,
    limit: Number(limit),
    offset: Number(offset),
    order: [["created_at", "DESC"]],
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "email", "phone"],
        include: [
          {
            model: db.UserProfile,
            as: "profile",
            attributes: ["full_name", "avatar_url"],
          },
        ],
      },
    ],
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: Number(page),
    limit: Number(limit),
    logs: rows,
  };
};

export default {
  logActivity,
  getActivityLogs,
};

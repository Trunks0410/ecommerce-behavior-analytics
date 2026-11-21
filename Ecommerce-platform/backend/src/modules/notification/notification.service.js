import { Op } from "sequelize";
import db from "../../database/models/index.js";

const CATEGORY_TYPES = {
  order: ["NEW_ORDER", "ORDER_UPDATE"],
  return: ["RETURN_REQUEST"],
  social: ["NEW_MESSAGE", "NEW_COMMENT"],
  shop: ["SHOP_STATUS", "PRODUCT_STATUS", "PAYOUT_STATUS"],
};
const ALL_GROUPED_TYPES = Object.values(CATEGORY_TYPES).flat();

// Lưu các kết nối SSE đang mở theo userId (0 query DB khi chờ thông báo mới)
const sseClients = new Map();

const registerClient = (userId, res) => {
  const key = Number(userId);
  if (!sseClients.has(key)) {
    sseClients.set(key, new Set());
  }
  const clients = sseClients.get(key);
  clients.add(res);

  return () => {
    clients.delete(res);
    if (clients.size === 0) {
      sseClients.delete(key);
    }
  };
};

const pushToUser = (userId, notification) => {
  const clients = sseClients.get(Number(userId));
  if (!clients || clients.size === 0) return;

  const payload = typeof notification?.toJSON === "function" ? notification.toJSON() : notification;
  const message = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const res of clients) {
    try {
      res.write(message);
    } catch {
      clients.delete(res);
    }
  }
};

const getNotificationsByUserId = async (userId) => {
  return await db.Notification.findAll({
    where: { user_id: userId },
    order: [["created_at", "DESC"]],
  });
};

const getNotificationsOverview = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const status = query.status || "all";
  const category = query.category || "all";
  const keyword = typeof query.q === "string" ? query.q.trim() : "";

  const where = { user_id: userId };

  if (status === "unread") {
    where.is_read = false;
  } else if (status === "read") {
    where.is_read = true;
  }

  if (category && category !== "all") {
    if (category === "system") {
      where.type = { [Op.notIn]: ALL_GROUPED_TYPES };
    } else if (CATEGORY_TYPES[category]) {
      where.type = { [Op.in]: CATEGORY_TYPES[category] };
    }
  }

  if (keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { content: { [Op.like]: `%${keyword}%` } },
    ];
  }

  const [{ rows, count }, groupedStats] = await Promise.all([
    db.Notification.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    }),
    db.Notification.findAll({
      where: { user_id: userId },
      attributes: [
        "type",
        "is_read",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "cnt"],
      ],
      group: ["type", "is_read"],
      raw: true,
    }),
  ]);

  const summary = {
    total: 0,
    unread: 0,
    read: 0,
    byCategory: {
      order: 0,
      return: 0,
      social: 0,
      shop: 0,
      system: 0,
    },
  };

  for (const row of groupedStats) {
    const cnt = Number(row.cnt || 0);
    summary.total += cnt;
    if (row.is_read) {
      summary.read += cnt;
    } else {
      summary.unread += cnt;
    }

    if (CATEGORY_TYPES.order.includes(row.type)) {
      summary.byCategory.order += cnt;
    } else if (CATEGORY_TYPES.return.includes(row.type)) {
      summary.byCategory.return += cnt;
    } else if (CATEGORY_TYPES.social.includes(row.type)) {
      summary.byCategory.social += cnt;
    } else if (CATEGORY_TYPES.shop.includes(row.type)) {
      summary.byCategory.shop += cnt;
    } else {
      summary.byCategory.system += cnt;
    }
  }

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
    summary,
  };
};

const deleteNotification = async (notificationId, userId) => {
  const deleted = await db.Notification.destroy({
    where: { id: notificationId, user_id: userId },
  });
  return deleted > 0;
};

const deleteReadNotifications = async (userId) => {
  const deletedCount = await db.Notification.destroy({
    where: { user_id: userId, is_read: true },
  });
  return deletedCount;
};

const createNotification = async (userId, title, content, type, options = {}) => {
  const actionUrl = typeof options === "string" ? options : options?.actionUrl || null;
  const created = await db.Notification.create({
    user_id: userId,
    title,
    content,
    type,
    action_url: actionUrl,
    is_read: false,
  });
  pushToUser(userId, created);
  return created;
};

const markAsRead = async (notificationId, userId) => {
  const notif = await db.Notification.findOne({
    where: { id: notificationId, user_id: userId }
  });
  if (notif) {
    await notif.update({ is_read: true });
  }
  return notif;
};

const markAllAsRead = async (userId) => {
  await db.Notification.update(
    { is_read: true },
    { where: { user_id: userId, is_read: false } }
  );
  return true;
};

const createNotificationForRole = async (roleName, title, content, type, options = {}) => {
  try {
    const actionUrl = typeof options === "string" ? options : options?.actionUrl || null;
    const role = await db.Role.findOne({ where: { role_name: roleName } });
    if (!role) return [];

    const users = await db.User.findAll({ where: { role_id: role.id }, attributes: ["id"] });
    if (users.length === 0) return [];

    const notifs = users.map((user) => ({
      user_id: user.id,
      title,
      content,
      type,
      action_url: actionUrl,
      is_read: false,
    }));

    const createdList = await db.Notification.bulkCreate(notifs);
    for (const notif of createdList) {
      pushToUser(notif.user_id, notif);
    }
    return createdList;
  } catch (error) {
    console.error(`Failed to create bulk notification for role ${roleName}:`, error);
    return [];
  }
};

export default {
  registerClient,
  getNotificationsByUserId,
  getNotificationsOverview,
  createNotification,
  createNotificationForRole,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
};

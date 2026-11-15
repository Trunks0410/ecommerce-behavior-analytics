import db from "../../database/models/index.js";

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

const createNotification = async (userId, title, content, type) => {
  const created = await db.Notification.create({
    user_id: userId,
    title,
    content,
    type,
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

const createNotificationForRole = async (roleName, title, content, type) => {
  try {
    const role = await db.Role.findOne({ where: { role_name: roleName } });
    if (!role) return [];

    const users = await db.User.findAll({ where: { role_id: role.id }, attributes: ["id"] });
    if (users.length === 0) return [];

    const notifs = users.map((user) => ({
      user_id: user.id,
      title,
      content,
      type,
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
  createNotification,
  createNotificationForRole,
  markAsRead,
  markAllAsRead,
};

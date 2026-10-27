import db from "../../database/models/index.js";

const getNotificationsByUserId = async (userId) => {
  return await db.Notification.findAll({
    where: { user_id: userId },
    order: [["created_at", "DESC"]],
  });
};

const createNotification = async (userId, title, content, type) => {
  return await db.Notification.create({
    user_id: userId,
    title,
    content,
    type,
    is_read: false,
  });
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

    return await db.Notification.bulkCreate(notifs);
  } catch (error) {
    console.error(`Failed to create bulk notification for role ${roleName}:`, error);
    return [];
  }
};

export default {
  getNotificationsByUserId,
  createNotification,
  createNotificationForRole,
  markAsRead,
  markAllAsRead,
};

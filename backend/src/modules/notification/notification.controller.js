import notificationService from "./notification.service.js";

const getNotifications = async (req, res) => {
  try {
    const list = await notificationService.getNotificationsByUserId(req.user.id);
    return res.status(200).json({ message: "Success", data: list });
  } catch (error) {
    console.error("Error getting notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await notificationService.markAsRead(id, req.user.id);
    return res.status(200).json({ message: "Success", data: notif });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(400).json({ message: error.message || "Error" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(400).json({ message: error.message || "Error" });
  }
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
};

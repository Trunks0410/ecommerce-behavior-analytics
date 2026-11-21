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

const getNotificationsOverview = async (req, res) => {
  try {
    const data = await notificationService.getNotificationsOverview(req.user.id, req.query);
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting notifications overview:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const deleted = await notificationService.deleteNotification(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(400).json({ message: error.message || "Error" });
  }
};

const deleteReadNotifications = async (req, res) => {
  try {
    const deletedCount = await notificationService.deleteReadNotifications(req.user.id);
    return res.status(200).json({ message: "Success", data: { deletedCount } });
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return res.status(400).json({ message: error.message || "Error" });
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

const streamNotifications = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  res.write(": connected\n\n");

  const unregister = notificationService.registerClient(req.user.id, res);
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      unregister();
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unregister();
  });
};

export default {
  getNotifications,
  getNotificationsOverview,
  streamNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
};

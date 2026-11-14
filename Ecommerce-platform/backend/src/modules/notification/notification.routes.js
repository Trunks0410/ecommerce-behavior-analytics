import express from "express";
import notificationController from "./notification.controller.js";
import { verifyToken } from "../../core/middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", notificationController.getNotifications);
router.patch("/:id/read", notificationController.markAsRead);
router.post("/read-all", notificationController.markAllAsRead);

export default router;

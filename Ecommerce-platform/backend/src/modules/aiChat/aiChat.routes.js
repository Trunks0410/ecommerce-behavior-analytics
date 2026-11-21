import express from "express";
import aiChatController from "./aiChat.controller.js";
import { optionalVerifyToken } from "../../core/middleware/auth.js";

const router = express.Router();

// Route phục vụ Chatbox AI hỗ trợ cả khách vãng lai và người dùng đã đăng nhập
router.post("/chat/ai", optionalVerifyToken, aiChatController.chatWithAI);

export default router;

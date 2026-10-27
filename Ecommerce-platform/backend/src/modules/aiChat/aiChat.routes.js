import express from "express";
import aiChatController from "./aiChat.controller.js";

const router = express.Router();

// Route công khai phục vụ Chatbox AI của Khách hàng
router.post("/chat/ai", aiChatController.chatWithAI);

export default router;

import aiChatService from "./aiChat.service.js";

const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Tin nhắn không được bỏ trống" });
    }
    const result = await aiChatService.chatWithAI(message);
    return res.status(200).json({
      reply: result.reply,
      products: result.products
    });
  } catch (error) {
    console.error("Error in aiChatController:", error);
    return res.status(500).json({ error: "Lỗi kết nối máy chủ AI" });
  }
};

export default {
  chatWithAI,
};

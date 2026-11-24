import aiChatService from "./aiChat.service.js";

const chatWithAI = async (req, res) => {
  try {
    const { message, language = "vi" } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: language === "en" ? "Message cannot be empty" : "Tin nhắn không được bỏ trống" });
    }
    const userId = req.user?.id || null;
    const result = await aiChatService.chatWithAI(message, userId, language);
    return res.status(200).json({
      reply: result.reply,
      products: result.products || [],
      orders: result.orders || [],
      vouchers: result.vouchers || [],
      suggestions: result.suggestions || []
    });
  } catch (error) {
    console.error("Error in aiChatController:", error);
    return res.status(500).json({ error: "Lỗi kết nối máy chủ AI" });
  }
};

export default {
  chatWithAI,
};

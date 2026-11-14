import chatService from "./chat.service.js";

const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;
    const messages = await chatService.getMessages(userId, partnerId);
    return res.status(200).json({ message: "Success", data: messages });
  } catch (error) {
    console.error("Error getting chat messages:", error);
    return res.status(500).json({ error: "Lỗi lấy lịch sử tin nhắn" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content, attachmentUrl, attachmentName, attachmentType } = req.body;
    if (!receiverId) {
      return res.status(400).json({ message: "Thiếu ID người nhận" });
    }
    const message = await chatService.sendMessage(
      senderId,
      receiverId,
      content,
      attachmentUrl,
      attachmentName,
      attachmentType
    );
    return res.status(201).json({ message: "Gửi tin nhắn thành công", data: message });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return res.status(400).json({ message: error.message || "Lỗi gửi tin nhắn" });
  }
};

const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file nào được chọn" });
    }
    return res.status(200).json({
      message: "Tải file lên thành công",
      data: {
        url: req.file.path,
        name: req.file.originalname,
        type: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("Error uploading chat attachment:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi tải file" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await chatService.getUnreadMessagesCount(userId);
    return res.status(200).json({ message: "Success", data: count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return res.status(500).json({ error: "Lỗi lấy số lượng tin nhắn chưa đọc" });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await chatService.getConversations(userId);
    return res.status(200).json({ message: "Success", data: conversations });
  } catch (error) {
    console.error("Error getting conversations:", error);
    return res.status(500).json({ error: "Lỗi lấy danh sách cuộc trò chuyện" });
  }
};

export default {
  getMessages,
  sendMessage,
  uploadAttachment,
  getUnreadCount,
  getConversations
};


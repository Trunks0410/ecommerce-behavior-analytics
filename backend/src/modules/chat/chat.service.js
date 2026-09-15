import db from "../../database/models/index.js";
import { Op } from "sequelize";
import notificationService from "../notification/notification.service.js";

const getMessages = async (userId, partnerId) => {
  let conversation = null;

  // 1. Tìm trường hợp userId là khách hàng, partnerId là shop_id
  conversation = await db.Conversation.findOne({
    where: { user_id: userId, shop_id: partnerId }
  });

  // 2. Nếu không tìm thấy, tìm trường hợp userId là Vendor (chủ shop), partnerId là khách hàng (user_id)
  if (!conversation) {
    const shop = await db.Shop.findOne({ where: { vendor_id: userId } });
    if (shop) {
      conversation = await db.Conversation.findOne({
        where: { shop_id: shop.id, user_id: partnerId }
      });
    }
  }

  if (!conversation) return [];

  // Đánh dấu đã đọc các tin nhắn của đối phương trong cuộc hội thoại này
  await db.Message.update(
    { is_read: true },
    {
      where: {
        conversation_id: conversation.id,
        sender_id: { [Op.ne]: userId },
        is_read: false
      }
    }
  );

  return await db.Message.findAll({
    where: { conversation_id: conversation.id },
    include: [
      {
        model: db.User,
        as: "sender",
        attributes: ["id", "email"],
        include: [
          {
            model: db.Role,
            as: "role",
            attributes: ["role_name"]
          }
        ]
      }
    ],
    order: [["sent_at", "ASC"]]
  });
};

const sendMessage = async (senderId, receiverId, content, attachmentUrl = null, attachmentName = null, attachmentType = null) => {
  const hasContent = content && content.trim();
  const hasAttachment = attachmentUrl && attachmentUrl.trim();

  if (!hasContent && !hasAttachment) {
    throw new Error("Tin nhắn phải có nội dung hoặc file đính kèm");
  }

  let shopId = null;
  let customerId = null;

  // Ưu tiên 1: Nếu người gửi là Vendor đang reply lại khách hàng (conversation đã tồn tại)
  const shopOfSender = await db.Shop.findOne({ where: { vendor_id: senderId } });
  if (shopOfSender) {
    const existingConv = await db.Conversation.findOne({
      where: { shop_id: shopOfSender.id, user_id: receiverId }
    });
    if (existingConv) {
      shopId = shopOfSender.id;
      customerId = receiverId;
    }
  }

  // Ưu tiên 2: Nếu không phải Vendor reply, thì đây là khách hàng nhắn cho Shop
  if (!shopId) {
    const shopByPk = await db.Shop.findByPk(receiverId);
    if (shopByPk) {
      shopId = shopByPk.id;
      customerId = senderId;
    }
  }

  if (!shopId || !customerId) {
    throw new Error("Không thể xác định đối tượng cuộc trò chuyện");
  }

  const [conversation] = await db.Conversation.findOrCreate({
    where: { user_id: customerId, shop_id: shopId }
  });

  const message = await db.Message.create({
    conversation_id: conversation.id,
    sender_id: senderId,
    body: content || null,
    is_read: false,
    attachment_url: attachmentUrl,
    attachment_name: attachmentName,
    attachment_type: attachmentType
  });

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentMessage = await db.Message.findOne({
      where: {
        conversation_id: conversation.id,
        sender_id: senderId,
        id: { [Op.ne]: message.id },
        sent_at: { [Op.gt]: tenMinutesAgo }
      }
    });

    if (!recentMessage) {
      let recipientId = null;
      let senderName = "Người dùng";
      
      if (senderId === customerId) {
        const shop = await db.Shop.findByPk(shopId);
        recipientId = shop ? shop.vendor_id : null;
        
        const customerProfile = await db.UserProfile.findOne({ where: { user_id: customerId } });
        const customerUser = await db.User.findByPk(customerId, { attributes: ["email"] });
        senderName = customerProfile?.full_name || customerUser?.email || "Khách hàng";
      } else {
        recipientId = customerId;
        const shop = await db.Shop.findByPk(shopId);
        senderName = shop ? shop.shop_name : "Cửa hàng";
      }

      if (recipientId) {
        let previewText = "";
        if (content) {
          previewText = content.length > 50 ? content.substring(0, 50) + "..." : content;
        } else if (attachmentUrl) {
          previewText = attachmentType?.startsWith("image/") ? "[Hình ảnh]" : `[Tệp đính kèm: ${attachmentName || "File"}]`;
        }

        await notificationService.createNotification(
          recipientId,
          "Tin nhắn mới",
          `Bạn có tin nhắn mới từ ${senderName}: "${previewText}"`,
          "NEW_MESSAGE"
        );
      }
    }
  } catch (notifErr) {
    console.error("Failed to create message notification:", notifErr);
  }

  return message;
};

const getUnreadMessagesCount = async (userId) => {
  const shop = await db.Shop.findOne({ where: { vendor_id: userId } });
  const shopId = shop ? shop.id : null;

  const conversationIds = [];
  const conversations = await db.Conversation.findAll({
    where: {
      [Op.or]: [
        { user_id: userId },
        ...(shopId ? [{ shop_id: shopId }] : [])
      ]
    },
    attributes: ["id"]
  });

  conversations.forEach((c) => conversationIds.push(c.id));

  if (conversationIds.length === 0) return 0;

  return await db.Message.count({
    where: {
      conversation_id: { [Op.in]: conversationIds },
      sender_id: { [Op.ne]: userId },
      is_read: false
    }
  });
};

const getConversations = async (userId) => {
  const shop = await db.Shop.findOne({ where: { vendor_id: userId } });
  const shopId = shop ? shop.id : null;

  const conversations = await db.Conversation.findAll({
    where: {
      [Op.or]: [
        { user_id: userId },
        ...(shopId ? [{ shop_id: shopId }] : [])
      ]
    },
    include: [
      {
        model: db.User,
        as: "user",
        include: [
          { model: db.UserProfile, as: "profile" },
          { model: db.Role, as: "role", attributes: ["role_name"] }
        ]
      },
      {
        model: db.Shop,
        as: "shop"
      }
    ],
    order: [["updated_at", "DESC"]]
  });

  const result = [];
  for (const conv of conversations) {
    const lastMessage = await db.Message.findOne({
      where: { conversation_id: conv.id },
      order: [["sent_at", "DESC"]]
    });

    const unreadCount = await db.Message.count({
      where: {
        conversation_id: conv.id,
        sender_id: { [Op.ne]: userId },
        is_read: false
      }
    });

    let partner = null;
    if (shopId && conv.shop_id === shopId) {
      partner = {
        type: "user",
        id: conv.user.id,
        name: conv.user.profile?.full_name || conv.user.email || "Khách hàng",
        avatar: conv.user.profile?.avatar_url || null,
        role: conv.user.role?.role_name || "USER"
      };
    } else if (conv.shop) {
      partner = {
        type: "shop",
        id: conv.shop.id,
        name: conv.shop.shop_name,
        avatar: conv.shop.shop_logo || null
      };
    } else {
      partner = {
        type: "shop",
        id: conv.shop_id,
        name: "Cửa hàng",
        avatar: null
      };
    }

    result.push({
      id: conv.id,
      partner,
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        body: lastMessage.body || (lastMessage.attachment_type?.startsWith("image/") ? "[Hình ảnh]" : "[Tệp tin]"),
        sent_at: lastMessage.sent_at,
        sender_id: lastMessage.sender_id,
        is_read: lastMessage.is_read
      } : null,
      unreadCount,
      updated_at: conv.updated_at
    });
  }

  result.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.sent_at).getTime() : new Date(a.updated_at).getTime();
    const timeB = b.lastMessage ? new Date(b.lastMessage.sent_at).getTime() : new Date(b.updated_at).getTime();
    return timeB - timeA;
  });

  return result;
};

export default {
  getMessages,
  sendMessage,
  getUnreadMessagesCount,
  getConversations
};


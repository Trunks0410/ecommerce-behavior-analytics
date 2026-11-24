import db from "../../database/models/index.js";
import notificationService from "../notification/notification.service.js";
import { getUteExpressShipmentByOrderReference } from "./shipment.service.js";

const getRole = (user) => {
  if (user.role?.role_name) return user.role.role_name;
  const roleMap = { 1: "admin", 2: "manager", 3: "vendor", 4: "shipper", 5: "user" };
  return roleMap[user.role_id] || "user";
};

const syncShopOrderFromShipment = async (shopOrder, shipment) => {
  if (!shopOrder || !shipment) return;
  const target = (shipment.status || "").toUpperCase();

  if (target === "DELIVERED" && shopOrder.status === "SHIPPING") {
    const transaction = await db.sequelize.transaction();
    try {
      const updates = {
        status: "DELIVERED",
        delivered_at: shipment.deliveredAt || new Date(),
      };
      if (shopOrder.parentOrder?.payment_method === "COD") {
        updates.cod_amount_collected = shopOrder.final_amount;
        updates.cod_status = "HELD_BY_SHIPPER";
        await shopOrder.parentOrder.update({ payment_status: "PAID" }, { transaction });
      }
      await shopOrder.update(updates, { transaction });
      await db.ShopOrderStatusHistory.create(
        {
          shop_order_id: shopOrder.id,
          old_status: "SHIPPING",
          new_status: "DELIVERED",
          note: "Shipper UTE Express đã giao hàng thành công.",
          changed_by: shopOrder.parentOrder?.user_id || 1,
        },
        { transaction }
      );
      await transaction.commit();
      shopOrder.status = "DELIVERED";

      try {
        const customerId = shopOrder.parentOrder?.user_id;
        const shop = await db.Shop.findByPk(shopOrder.shop_id, { attributes: ["vendor_id"] });
        if (customerId) {
          await notificationService.createNotification(
            customerId,
            "Giao hàng thành công",
            `Đơn hàng ${shopOrder.shop_order_code} đã được giao thành công. Vui lòng kiểm tra và bấm "Đã nhận hàng".`,
            "ORDER_UPDATE",
            { actionUrl: `/orders/${shopOrder.id}` }
          );
        }
        if (shop?.vendor_id) {
          await notificationService.createNotification(
            shop.vendor_id,
            "Đơn hàng đã giao thành công",
            `Đơn hàng ${shopOrder.shop_order_code} đã được shipper UTE Express giao thành công đến khách hàng.`,
            "ORDER_UPDATE",
            { actionUrl: "/vendor?tab=orders" }
          );
        }
      } catch (notifErr) {
        console.warn("Failed to create DELIVERED notification:", notifErr.message);
      }
    } catch (err) {
      await transaction.rollback();
      console.error("Failed to sync DELIVERED status to ShopOrder:", err.message);
    }
  } else if (target === "RETURNED" && ["SHIPPING", "RETURN_PENDING"].includes(shopOrder.status)) {
    const transaction = await db.sequelize.transaction();
    try {
      const prevStatus = shopOrder.status;
      await shopOrder.update({ status: "RETURNED" }, { transaction });
      await db.ShopOrderStatusHistory.create(
        {
          shop_order_id: shopOrder.id,
          old_status: prevStatus,
          new_status: "RETURNED",
          note: "Đơn hàng đã hoàn về cửa hàng qua UTE Express.",
          changed_by: shopOrder.parentOrder?.user_id || 1,
        },
        { transaction }
      );
      await transaction.commit();
      shopOrder.status = "RETURNED";

      try {
        const customerId = shopOrder.parentOrder?.user_id;
        const shop = await db.Shop.findByPk(shopOrder.shop_id, { attributes: ["vendor_id"] });
        if (customerId) {
          await notificationService.createNotification(
            customerId,
            "Đơn hàng đã hoàn trả",
            `Đơn hàng ${shopOrder.shop_order_code} đã được hoàn về cửa hàng qua UTE Express.`,
            "ORDER_UPDATE",
            { actionUrl: `/orders/${shopOrder.id}` }
          );
        }
        if (shop?.vendor_id) {
          await notificationService.createNotification(
            shop.vendor_id,
            "Đơn hàng đã hoàn về shop",
            `Đơn hàng ${shopOrder.shop_order_code} đã được chuyển hoàn về cửa hàng.`,
            "ORDER_UPDATE",
            { actionUrl: "/vendor?tab=orders" }
          );
        }
      } catch (notifErr) {
        console.warn("Failed to create RETURNED notification:", notifErr.message);
      }
    } catch (err) {
      await transaction.rollback();
      console.error("Failed to sync RETURNED status to ShopOrder:", err.message);
    }
  }
};

const handleShipmentWebhook = async (req, res) => {
  try {
    const apiKey = req.headers["x-service-api-key"];
    const expectedKey = process.env.UTE_SHIPMENT_SERVICE_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      return res.status(401).json({ message: "Unauthorized webhook" });
    }

    const { orderReference, status, deliveredAt } = req.body || {};
    if (!orderReference || !status) {
      return res.status(400).json({ message: "orderReference and status are required" });
    }

    const shopOrder = await db.ShopOrder.findOne({
      where: { shop_order_code: orderReference },
      include: [{ model: db.ParentOrder, as: "parentOrder" }],
    });
    if (!shopOrder) {
      return res.status(404).json({ message: "ShopOrder not found" });
    }

    await syncShopOrderFromShipment(shopOrder, { status, deliveredAt });
    return res.status(200).json({ message: "Synced", status: shopOrder.status });
  } catch (error) {
    console.error("Shipment webhook error:", error);
    return res.status(500).json({ message: "Webhook error" });
  }
};

const SELLER_STAGE_NOTES = {
  PENDING: "Đơn hàng đang chờ nhà bán hàng xác nhận.",
  CONFIRMED: "Nhà bán hàng đã xác nhận đơn hàng.",
  PREPARING: "Nhà bán hàng đang chuẩn bị và đóng gói sản phẩm.",
  READY_FOR_PICKUP: "Đơn hàng đã sẵn sàng bàn giao cho đơn vị vận chuyển.",
  SHIPPING: "Nhà bán hàng đã bàn giao đơn hàng cho đơn vị vận chuyển UTE Express.",
  DELIVERED: "Đơn hàng đã được giao thành công đến người nhận.",
  COMPLETED: "Đơn hàng đã hoàn tất.",
  CANCELLED: "Đơn hàng đã bị hủy.",
  CANCEL_REQUESTED: "Người mua đã gửi yêu cầu hủy đơn hàng.",
  RETURN_PENDING: "Đơn hàng đang trong quá trình chuyển hoàn.",
  RETURNED: "Đơn hàng đã hoàn về cửa hàng.",
};

const getShipmentByOrder = async (req, res) => {
  try {
    const shopOrder = await db.ShopOrder.findByPk(req.params.orderId, {
      include: [{ model: db.ParentOrder, as: "parentOrder" }],
    });
    if (!shopOrder) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });

    const role = getRole(req.user);
    let hasAccess = ["admin", "manager"].includes(role)
      || Number(shopOrder.parentOrder?.user_id) === Number(req.user.id);
    if (role === "vendor") {
      hasAccess = Boolean(await db.Shop.findOne({
        where: { id: shopOrder.shop_id, vendor_id: req.user.id },
        attributes: ["id"],
      }));
    }
    if (!hasAccess) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });

    const [statusLogs, shipment] = await Promise.all([
      db.ShopOrderStatusHistory.findAll({
        where: { shop_order_id: shopOrder.id },
        order: [["changed_at", "ASC"], ["id", "ASC"]],
      }),
      getUteExpressShipmentByOrderReference(shopOrder.shop_order_code).catch((err) => {
        if (err?.response?.status === 404 || err?.status === 404) return null;
        console.warn("UTE Express lookup warning:", err.message);
        return null;
      }),
    ]);

    if (shipment) {
      await syncShopOrderFromShipment(shopOrder, shipment);
    }

    // 1. Lịch sử từ lúc đặt hàng & nhà bán hàng xử lý
    const sellerHistories = [
      {
        id: `order-placed-${shopOrder.id}`,
        shipment_id: shipment?.id ?? null,
        status: "ORDER_PLACED",
        location: null,
        note: "Đơn hàng đã được đặt thành công.",
        proof_image_url: null,
        created_at: shopOrder.created_at,
      },
    ];

    for (const log of statusLogs) {
      const statusCode = log.new_status;
      if (!statusCode || statusCode === "PENDING") continue;
      sellerHistories.push({
        id: `order-hist-${log.id}`,
        shipment_id: shipment?.id ?? null,
        status: statusCode,
        location: null,
        note: log.note || SELLER_STAGE_NOTES[statusCode] || `Cập nhật trạng thái: ${statusCode}`,
        proof_image_url: null,
        created_at: log.changed_at,
      });
    }

    // 2. Lịch sử từ đơn vị vận chuyển UTE Express (khi đã bàn giao)
    const carrierHistories = (shipment?.events ?? []).map((event, index) => ({
      id: `${shipment.id}-${index}`,
      shipment_id: shipment.id,
      status: event.toStatus,
      location: event.location || null,
      note: event.note || event.title,
      proof_image_url: event.proofImageUrl ?? null,
      created_at: event.createdAt,
    }));

    // Gộp và sắp xếp mới nhất lên trên
    const combinedHistories = [...sellerHistories, ...carrierHistories].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return res.status(200).json({
      message: "Success",
      data: {
        id: shipment?.id ?? `order-${shopOrder.id}`,
        shop_order_id: shopOrder.id,
        shipper_id: shipment?.agent?.id ?? null,
        tracking_number: shipment?.trackingNumber ?? null,
        status: shipment?.status ?? shopOrder.status,
        shipping_fee: Number(shipment?.shippingFee ?? shopOrder.shipping_fee ?? 0),
        histories: combinedHistories,
        shipper: shipment?.agent
          ? {
              id: shipment.agent.id,
              full_name: shipment.agent.fullName,
              phone: shipment.agent.phone,
              avatar_url: shipment.agent.avatarUrl,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to load UTE Express shipment:", error);
    const status = error.isAxiosError ? 502 : 500;
    return res.status(status).json({
      message: status === 502
        ? "Không thể tải thông tin vận đơn UTE Express."
        : "Đã xảy ra lỗi khi tải thông tin vận đơn.",
    });
  }
};

export default {
  getShipmentByOrder,
  handleShipmentWebhook,
  syncShopOrderFromShipment,
};

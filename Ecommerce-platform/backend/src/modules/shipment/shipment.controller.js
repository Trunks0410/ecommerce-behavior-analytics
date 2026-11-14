import db from "../../database/models/index.js";
import { getUteExpressShipmentByOrderReference } from "./shipment.service.js";

const getRole = (user) => {
  if (user.role?.role_name) return user.role.role_name;
  const roleMap = { 1: "admin", 2: "manager", 3: "vendor", 4: "shipper", 5: "user" };
  return roleMap[user.role_id] || "user";
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

    const shipment = await getUteExpressShipmentByOrderReference(shopOrder.shop_order_code);
    if (!shipment) return res.status(404).json({ message: "Chưa có vận đơn UTE Express." });

    return res.status(200).json({
      message: "Success",
      data: {
        id: shipment.id,
        shop_order_id: shopOrder.id,
        shipper_id: shipment.agent?.id ?? null,
        tracking_number: shipment.trackingNumber,
        status: shipment.status,
        shipping_fee: Number(shipment.shippingFee),
        histories: (shipment.events ?? []).map((event, index) => ({
          id: `${shipment.id}-${index}`,
          shipment_id: shipment.id,
          status: event.toStatus,
          location: null,
          note: event.note || event.title,
          proof_image_url: event.proofImageUrl ?? null,
          created_at: event.createdAt,
        })).reverse(),
        shipper: shipment.agent
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

export default { getShipmentByOrder };

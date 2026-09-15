import orderService from "./order.service.js";
import vnpayService from "../payment/vnpay.service.js";

const createOrder = async (req, res) => {
  try {
    const {
      paymentMethod,
      addressId,
      platformCouponCode,
      shopCoupons,
      items,
      usePoints,
      is_cart_checkout,
      note,
    } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: "Thiếu thông tin giao hàng (addressId)" });
    }

    const order = await orderService.createOrder(req.user.id, {
      paymentMethod,
      addressId,
      platformCouponCode,
      shopCoupons,
      items,
      usePoints,
      is_cart_checkout,
      note,
    });

    let paymentUrl = null;
    if (paymentMethod === "VNPAY") {
      let ipAddr =
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.connection?.socket?.remoteAddress ||
        "127.0.0.1";
      
      const orderInfo = `Thanh toan don hang ${order.checkout_code}`;
      paymentUrl = vnpayService.createPaymentUrl(ipAddr, order.checkout_code, order.total_amount, orderInfo);
    }

    return res
      .status(201)
      .json({ message: "Đặt hàng thành công", data: { ...order.toJSON(), paymentUrl } });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const result = await orderService.getUserOrders(req.user.id, req.query);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMyOrderCounts = async (req, res) => {
  try {
    const result = await orderService.getUserOrderCounts(req.user.id);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const calculateCheckout = async (req, res) => {
  try {
    const { items, platformCouponCode, shopCoupons, usePoints } = req.body;
    const result = await orderService.calculateCheckout(req.user.id, {
      items,
      platformCouponCode,
      shopCoupons,
      usePoints,
    });
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const { orderId } = req.params; // this is shop_order_id
    
    let role = "user";
    if (req.user.role && req.user.role.role_name) {
       role = req.user.role.role_name;
    } else if (req.user.role_id) {
       const roleMap = { 1: "admin", 2: "manager", 3: "vendor", 4: "shipper", 5: "user" };
       role = roleMap[req.user.role_id] || "user";
    }
    
    const order = await orderService.updateOrderStatus(orderId, req.user.id, status, role, note);
    return res.status(200).json({ message: "Cập nhật trạng thái thành công", data: order });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    
    let role = "user";
    if (req.user.role && req.user.role.role_name) {
       role = req.user.role.role_name;
    } else if (req.user.role_id) {
       const roleMap = { 1: "admin", 2: "manager", 3: "vendor", 4: "shipper", 5: "user" };
       role = roleMap[req.user.role_id] || "user";
    }
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Danh sách đơn hàng không hợp lệ" });
    }
    
    const result = await orderService.bulkUpdateOrderStatus(orderIds, req.user.id, status, role);
    return res.status(200).json({ message: "Cập nhật trạng thái hàng loạt thành công", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getShipperOrders = async (req, res) => {
  try {
    const result = await orderService.getShipperOrders(req.user.id, req.query);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderService.getOrderDetail(id, req.user.id);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await orderService.cancelOrder(id, req.user.id, reason);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export default {
  createOrder,
  getMyOrders,
  getMyOrderCounts,
  calculateCheckout,
  updateOrderStatus,
  getOrderDetail,
  cancelOrder,
  getShipperOrders,
  bulkUpdateOrderStatus,
};

import vnpayService from "../payment/vnpay.service.js";
import sepayService from "../payment/sepay.service.js";
import db from "../../database/models/index.js";

const markOrderPaidByGateway = async (order, gatewayName, transId, amount, message) => {
  if (!order || order.payment_status === "PAID") return order;
  order.payment_status = "PAID";
  await order.save();
  await db.ShopOrder.update(
    { status: "PENDING" },
    { where: { parent_order_id: order.id } }
  );
  await db.PaymentLog.create({
    order_code: order.checkout_code,
    gateway_name: gatewayName,
    amount: amount ?? order.total_amount,
    status: "PAID",
    trans_id: transId || null,
    message: message || `Thanh toán thành công qua ${gatewayName}`,
  });
  return order;
};

const vnpayReturn = async (req, res) => {
  let vnp_Params = req.query;
  let isValidSignature = vnpayService.verifyIpnCall(vnp_Params);

  if (isValidSignature) {
    if (vnp_Params["vnp_ResponseCode"] === "00") {
      try {
        let orderId = vnp_Params["vnp_TxnRef"];
        const order = await db.ParentOrder.findOne({ where: { checkout_code: orderId } });
        if (order && order.payment_status === "UNPAID") {
          order.payment_status = "PAID";
          await order.save();
          await db.ShopOrder.update(
            { status: "PENDING" },
            { where: { parent_order_id: order.id } }
          );
          await db.PaymentLog.create({
            order_code: orderId,
            gateway_name: "VNPAY",
            amount: order.total_amount,
            status: "PAID",
            trans_id: vnp_Params["vnp_TransactionNo"] || null,
            message: "Thanh toán thành công qua VNPAY",
          });
        }
      } catch (e) {
        console.error("Error updating order in vnpayReturn:", e);
      }
      res.status(200).json({ message: "Thanh toán thành công", code: vnp_Params["vnp_ResponseCode"] });
    } else {
      res.status(400).json({ message: "Thanh toán không thành công", code: vnp_Params["vnp_ResponseCode"] });
    }
  } else {
    res.status(400).json({ message: "Chữ ký không hợp lệ" });
  }
};

const vnpayIpn = async (req, res) => {
  let vnp_Params = req.query;
  let isValidSignature = vnpayService.verifyIpnCall(vnp_Params);

  if (isValidSignature) {
    let orderId = vnp_Params["vnp_TxnRef"];
    let rspCode = vnp_Params["vnp_ResponseCode"];

    try {
      const order = await db.ParentOrder.findOne({ where: { checkout_code: orderId } });
      if (!order) {
        return res.status(200).json({ RspCode: "01", Message: "Order not found" });
      }

      if (order.payment_status !== "UNPAID") {
        return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
      }

      // vnp_Amount is multiplied by 100
      let vnp_Amount = vnp_Params["vnp_Amount"] / 100;
      if (Number(order.total_amount) !== Number(vnp_Amount)) {
        return res.status(200).json({ RspCode: "04", Message: "Invalid amount" });
      }

      if (rspCode === "00") {
        // Payment success
        order.payment_status = "PAID";
        await order.save();
        
        // Cập nhật tất cả ShopOrders thành PAID (nếu cần thiết hoặc giữ PENDING)
        await db.ShopOrder.update(
          { status: "PENDING" }, // ShopOrder status could be something else
          { where: { parent_order_id: order.id } }
        );
        
        await db.PaymentLog.create({
          order_code: orderId,
          gateway_name: "VNPAY",
          amount: vnp_Amount,
          status: "PAID",
          trans_id: vnp_Params["vnp_TransactionNo"] || null,
          message: "Thanh toán thành công qua VNPAY",
        });

        return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
      } else {
        // Payment failed
        order.payment_status = "FAILED";
        await order.save();
        
        await db.PaymentLog.create({
          order_code: orderId,
          gateway_name: "VNPAY",
          amount: vnp_Amount,
          status: "FAILED",
          trans_id: vnp_Params["vnp_TransactionNo"] || null,
          message: `Giao dịch thất bại. Mã lỗi: ${rspCode}`,
        });

        // Xóa hoặc update trạng thái các shop orders nếu muốn
        return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
      }
    } catch (e) {
      console.error("IPN Error:", e);
      return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
    }
  } else {
    return res.status(200).json({ RspCode: "97", Message: "Invalid signature" });
  }
};

const vnpayRetry = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await db.ParentOrder.findOne({
      where: { id: orderId, user_id: req.user.id }
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.payment_method !== "VNPAY") {
      return res.status(400).json({ message: "Đơn hàng này không sử dụng phương thức VNPay" });
    }

    if (order.payment_status !== "UNPAID") {
      return res.status(400).json({ message: "Đơn hàng đã được thanh toán hoặc không hợp lệ" });
    }

    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      "127.0.0.1";
    
    const orderInfo = `Thanh toan don hang ${order.checkout_code}`;
    const paymentUrl = vnpayService.createPaymentUrl(ipAddr, order.checkout_code, order.total_amount, orderInfo);

    return res.status(200).json({ message: "Thành công", data: { paymentUrl } });
  } catch (error) {
    console.error("vnpayRetry Error:", error);
    return res.status(500).json({ message: "Lỗi tạo lại URL thanh toán" });
  }
};

const sepayIpn = async (req, res) => {
  try {
    if (!sepayService.verifySecretHeader(req)) {
      return res.status(401).json({ success: false, message: "Invalid SePay secret key" });
    }

    const payload = req.body || {};
    const notificationType = payload.notification_type || payload.event;
    const orderObj = payload.order || {};
    const txObj = payload.transaction || {};

    const orderInvoiceNumber =
      orderObj.order_invoice_number || payload.order_invoice_number || payload.order_code;
    const orderStatus = String(
      orderObj.order_status || payload.order_status || payload.payment_status || ""
    ).toUpperCase();
    const txStatus = String(txObj.transaction_status || payload.transaction_status || "").toUpperCase();
    const paidAmount = Number(
      orderObj.order_amount ?? txObj.transaction_amount ?? payload.order_amount ?? 0
    );
    const transId = txObj.transaction_id || payload.transaction_id || null;

    // Xử lý tín hiệu "Gửi test" từ SePay Dashboard
    if (notificationType === "TEST" || !orderInvoiceNumber) {
      return res.status(200).json({ success: true, message: "SePay IPN endpoint is ready" });
    }

    const order = await db.ParentOrder.findOne({ where: { checkout_code: orderInvoiceNumber } });
    if (!order) {
      // Nếu SePay gửi mẫu đơn test chưa tồn tại trong DB vẫn trả 200 để test IPN pass
      return res.status(200).json({ success: true, message: "Order not found (ignored)" });
    }

    const isSuccess =
      notificationType === "ORDER_PAID" ||
      orderStatus === "CAPTURED" ||
      orderStatus === "PAID" ||
      orderStatus === "SUCCESS" ||
      txStatus === "APPROVED";

    if (isSuccess) {
      if (paidAmount > 0 && Math.round(Number(order.total_amount)) !== Math.round(paidAmount)) {
        return res.status(400).json({ success: false, message: "Amount mismatch" });
      }
      await markOrderPaidByGateway(
        order,
        "SEPAY",
        transId,
        paidAmount || order.total_amount,
        "Thanh toán thành công qua SePay"
      );
      return res.status(200).json({ success: true });
    }

    const isFailed =
      orderStatus === "CANCELLED" ||
      orderStatus === "FAILED" ||
      txStatus === "DECLINED" ||
      txStatus === "FAILED";

    if (isFailed) {
      await db.PaymentLog.create({
        order_code: order.checkout_code,
        gateway_name: "SEPAY",
        amount: paidAmount || order.total_amount,
        status: "FAILED",
        trans_id: transId,
        message: `Giao dịch SePay chưa thành công (${orderStatus || txStatus})`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("sepayIpn Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const sepayVerify = async (req, res) => {
  try {
    const orderCode = String(req.query.order_code || "").trim();
    const callbackStatus = String(req.query.status || "").trim().toLowerCase();

    if (!orderCode) {
      return res.status(400).json({ message: "Thiếu mã đơn hàng (order_code)" });
    }

    const order = await db.ParentOrder.findOne({ where: { checkout_code: orderCode } });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.payment_status === "PAID") {
      return res.status(200).json({
        status: "PAID",
        code: "00",
        orderCode: order.checkout_code,
        message: "Thanh toán thành công qua SePay",
      });
    }

    if (callbackStatus === "cancel") {
      return res.status(200).json({
        status: "CANCELLED",
        code: "24",
        orderCode: order.checkout_code,
        message: "Bạn đã hủy giao dịch thanh toán SePay.",
      });
    }

    if (callbackStatus === "error") {
      return res.status(200).json({
        status: "FAILED",
        code: "99",
        orderCode: order.checkout_code,
        message: "Giao dịch thanh toán qua SePay không thành công.",
      });
    }

    // Fallback: Truy vấn trực tiếp SePay API phòng trường hợp IPN chưa kịp gọi tới
    try {
      const sepayOrder = await sepayService.retrieveOrderStatus(orderCode);
      const remoteStatus = String(sepayOrder?.order_status || "").toUpperCase();
      if (remoteStatus === "CAPTURED" || remoteStatus === "PAID") {
        await markOrderPaidByGateway(
          order,
          "SEPAY",
          sepayOrder?.id || null,
          sepayOrder?.order_amount || order.total_amount,
          "Thanh toán thành công qua SePay (xác thực qua API)"
        );
        return res.status(200).json({
          status: "PAID",
          code: "00",
          orderCode: order.checkout_code,
          message: "Thanh toán thành công qua SePay",
        });
      }
    } catch (retrieveErr) {
      console.warn("sepayVerify retrieve fallback warning:", retrieveErr?.message);
    }

    return res.status(200).json({
      status: "PENDING",
      code: "01",
      orderCode: order.checkout_code,
      message: "Giao dịch đang chờ xác nhận từ SePay. Vui lòng kiểm tra lại trong Lịch sử đơn hàng.",
    });
  } catch (error) {
    console.error("sepayVerify Error:", error);
    return res.status(500).json({ message: "Lỗi xác thực thanh toán SePay" });
  }
};

const sepayRetry = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await db.ParentOrder.findOne({
      where: { id: orderId, user_id: req.user.id },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    if (!["SEPAY", "VNPAY"].includes(order.payment_method)) {
      return res.status(400).json({ message: "Đơn hàng này không sử dụng thanh toán trực tuyến" });
    }
    if (order.payment_status !== "UNPAID") {
      return res.status(400).json({ message: "Đơn hàng đã được thanh toán hoặc không hợp lệ" });
    }

    const sepayCheckout = sepayService.createCheckoutPayload({
      checkoutCode: order.checkout_code,
      amount: order.total_amount,
      description: `Thanh toan don hang ${order.checkout_code}`,
      customerId: req.user.id,
    });

    return res.status(200).json({
      message: "Thành công",
      data: { sepayCheckout },
    });
  } catch (error) {
    console.error("sepayRetry Error:", error);
    return res.status(500).json({ message: error.message || "Lỗi tạo lại thanh toán SePay" });
  }
};

export default {
  vnpayReturn,
  vnpayIpn,
  vnpayRetry,
  sepayIpn,
  sepayVerify,
  sepayRetry,
};

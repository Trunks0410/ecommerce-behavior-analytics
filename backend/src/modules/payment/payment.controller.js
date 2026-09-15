import vnpayService from "../payment/vnpay.service.js";
import db from "../../database/models/index.js";

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

export default {
  vnpayReturn,
  vnpayIpn,
  vnpayRetry,
};

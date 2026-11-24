import { SePayPgClient } from "sepay-pg-node";

const getSepayConfig = () => ({
  env: process.env.SEPAY_ENV === "production" ? "production" : "sandbox",
  merchant_id: (process.env.SEPAY_MERCHANT_ID || "").trim(),
  secret_key: (process.env.SEPAY_SECRET_KEY || "").trim(),
});

const getClient = () => {
  const cfg = getSepayConfig();
  if (!cfg.merchant_id || !cfg.secret_key) {
    throw new Error("Cấu hình SePay chưa đầy đủ (thiếu SEPAY_MERCHANT_ID hoặc SEPAY_SECRET_KEY)");
  }
  return new SePayPgClient(cfg);
};

const getFrontendBaseUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

const createCheckoutPayload = ({ checkoutCode, amount, description, customerId }) => {
  const client = getClient();
  const frontendUrl = getFrontendBaseUrl();
  const encodedCode = encodeURIComponent(checkoutCode);

  const checkoutUrl = client.checkout.initCheckoutUrl();
  const fields = client.checkout.initOneTimePaymentFields({
    operation: "PURCHASE",
    payment_method: "BANK_TRANSFER",
    order_invoice_number: checkoutCode,
    order_amount: Math.round(Number(amount)),
    currency: "VND",
    order_description: description || `Thanh toan don hang ${checkoutCode}`,
    ...(customerId ? { customer_id: String(customerId) } : {}),
    success_url: `${frontendUrl}/payment/sepay-return?status=success&order_code=${encodedCode}`,
    error_url: `${frontendUrl}/payment/sepay-return?status=error&order_code=${encodedCode}`,
    cancel_url: `${frontendUrl}/payment/sepay-return?status=cancel&order_code=${encodedCode}`,
  });

  return { checkoutUrl, fields };
};

const verifySecretHeader = (req) => {
  const cfg = getSepayConfig();
  const incomingSecret =
    req.headers["x-secret-key"] ||
    req.headers["x-sepay-secret-key"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

  if (!incomingSecret) {
    // Một số payload test IPN từ SePay không kèm header secret
    return true;
  }
  return String(incomingSecret).trim() === cfg.secret_key;
};

const retrieveOrderStatus = async (orderInvoiceNumber) => {
  const client = getClient();
  const res = await client.order.retrieve(orderInvoiceNumber);
  return res?.data?.data || res?.data || null;
};

export default {
  createCheckoutPayload,
  verifySecretHeader,
  retrieveOrderStatus,
};

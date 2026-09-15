import crypto from "crypto";
import qs from "qs";
import moment from "moment";
import { vnpayConfig } from "../../core/config/vnpayConfig.js";

const sortObject = (obj) => {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
};

const createPaymentUrl = (ipAddr, orderId, amount, orderInfo) => {
  let date = new Date();
  let createDate = moment(date).format("YYYYMMDDHHmmss");

  let tmnCode = vnpayConfig.vnp_TmnCode;
  let secretKey = vnpayConfig.vnp_HashSecret;
  let vnpUrl = vnpayConfig.vnp_Url;
  let returnUrl = vnpayConfig.vnp_ReturnUrl;

  let vnp_Params = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = "vn";
  vnp_Params["vnp_CurrCode"] = "VND";
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = orderInfo;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100; // VNPay requires amount * 100
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;

  vnp_Params = sortObject(vnp_Params);

  let signData = qs.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + qs.stringify(vnp_Params, { encode: false });

  return vnpUrl;
};

const verifyIpnCall = (params) => {
  let vnp_Params = { ...params };
  let secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);
  let secretKey = vnpayConfig.vnp_HashSecret;
  let signData = qs.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac("sha512", secretKey || "");
  let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  console.log("=== VNPay Verification Debug ===");
  console.log("SecretKey:", secretKey);
  console.log("SignData:", signData);
  console.log("Expected Hash:", secureHash);
  console.log("Actual Hash:", signed);
  console.log("Is Match:", secureHash === signed);

  if (secureHash === signed) {
    return true;
  }
  return false;
};

export default {
  createPaymentUrl,
  verifyIpnCall,
};

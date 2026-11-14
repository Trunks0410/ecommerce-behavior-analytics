import couponService from "./coupon.service.js";

const getValidCoupons = async (req, res) => {
  try {
    const userId = req.user?.id;
    const coupons = await couponService.getValidCoupons(userId);
    return res.status(200).json({ message: "Success", data: coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const saveCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId } = req.body;
    if (!couponId) {
      return res.status(400).json({ message: "Vui lòng cung cấp couponId" });
    }
    const userCoupon = await couponService.saveCoupon(userId, couponId);
    return res.status(200).json({ message: "Lưu mã giảm giá thành công", data: userCoupon });
  } catch (error) {
    console.error("Error saving coupon:", error);
    return res.status(400).json({ message: error.message || "Lỗi khi lưu mã giảm giá" });
  }
};

const unsaveCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId } = req.params;
    await couponService.unsaveCoupon(userId, couponId);
    return res.status(200).json({ message: "Bỏ lưu mã giảm giá thành công" });
  } catch (error) {
    console.error("Error unsaving coupon:", error);
    return res.status(400).json({ message: error.message || "Lỗi khi bỏ lưu mã giảm giá" });
  }
};

const getMySavedCoupons = async (req, res) => {
  try {
    const userId = req.user.id;
    const coupons = await couponService.getMySavedCoupons(userId);
    return res.status(200).json({ message: "Success", data: coupons });
  } catch (error) {
    console.error("Error fetching my saved coupons:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMyVoucherWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const walletInfo = await couponService.getMyVoucherWallet(userId);
    return res.status(200).json({ message: "Success", data: walletInfo });
  } catch (error) {
    console.error("Error fetching voucher wallet:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const saveCouponByCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Vui lòng cung cấp mã code" });
    }
    const userCoupon = await couponService.saveCouponByCode(userId, code);
    return res.status(200).json({ message: "Lưu mã giảm giá thành công", data: userCoupon });
  } catch (error) {
    console.error("Error saving coupon by code:", error);
    return res.status(400).json({ message: error.message || "Lỗi khi lưu mã giảm giá" });
  }
};

export default {
  getValidCoupons,
  saveCoupon,
  unsaveCoupon,
  getMySavedCoupons,
  getMyVoucherWallet,
  saveCouponByCode,
};

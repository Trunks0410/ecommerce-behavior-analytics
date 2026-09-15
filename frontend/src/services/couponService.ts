import { axiosClient } from "@/shared/api/axiosClient";

const couponService = {
  getValidCoupons: async () => {
    const response = await axiosClient.get("/coupons/valid");
    return response.data.data;
  },
  getMySavedCoupons: async () => {
    const response = await axiosClient.get("/coupons/my-saved");
    return response.data.data;
  },
  getMyVoucherWallet: async () => {
    const response = await axiosClient.get("/coupons/my-wallet");
    return response.data.data;
  },
  saveCoupon: async (couponId: number) => {
    const response = await axiosClient.post("/coupons/save", { couponId });
    return response.data.data;
  },
  saveCouponByCode: async (code: string) => {
    const response = await axiosClient.post("/coupons/save-by-code", { code });
    return response.data.data;
  },
  unsaveCoupon: async (couponId: number) => {
    const response = await axiosClient.delete(`/coupons/save/${couponId}`);
    return response.data;
  },
};

export default couponService;

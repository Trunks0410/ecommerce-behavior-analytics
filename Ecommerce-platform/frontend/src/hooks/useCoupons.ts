import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import couponService from "@/services/couponService";

export const useValidCoupons = () => {
  return useQuery({
    queryKey: ["valid-coupons"],
    queryFn: () => couponService.getValidCoupons(),
  });
};

export const useMySavedCoupons = () => {
  return useQuery({
    queryKey: ["my-saved-coupons"],
    queryFn: () => couponService.getMySavedCoupons(),
  });
};

export const useMyVoucherWallet = () => {
  return useQuery({
    queryKey: ["my-voucher-wallet"],
    queryFn: () => couponService.getMyVoucherWallet(),
  });
};

export const useSaveCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (couponId: number) => couponService.saveCoupon(couponId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valid-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["my-saved-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["my-voucher-wallet"] });
    },
  });
};

export const useSaveCouponByCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => couponService.saveCouponByCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valid-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["my-saved-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["my-voucher-wallet"] });
    },
  });
};

export const useUnsaveCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (couponId: number) => couponService.unsaveCoupon(couponId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valid-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["my-saved-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["my-voucher-wallet"] });
    },
  });
};

import { useQuery } from "@tanstack/react-query";
import { vendorService, ShopProfileData } from "@/services/vendorService";

export const useTopShops = (limit: number = 10) => {
  return useQuery<{ message: string; data: ShopProfileData[] }, Error>({
    queryKey: ["top-shops", limit],
    queryFn: () => vendorService.getTopShops(limit),
    staleTime: 5 * 60 * 1000,
  });
};

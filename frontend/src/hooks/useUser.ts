import { useQuery } from "@tanstack/react-query";
import { userService, UserProfile } from "@/services/userService";

export interface UserProfile {
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  loyalty_points: number;
  shipper_shop_id?: number | null;
}

export const useProfile = (options?: any) => {
  return useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => userService.getProfile().then(res => res.data.data),
    ...options
  });
};

export const useFavorites = (options?: any) => {
  return useQuery<any[]>({
    queryKey: ["favorites"],
    queryFn: () => userService.getFavorites().then(res => res.data.data),
    ...options
  });
};

export const useViewedProducts = (options?: any) => {
  return useQuery<any[]>({
    queryKey: ["viewed-products"],
    queryFn: () => userService.getViewedProducts().then(res => res.data.data),
    ...options
  });
};

import { axiosClient } from "@/shared/api/axiosClient";

export type UpdateProfileData = {
  full_name?: string;
  date_of_birth?: string;
  address?: string;
  gender?: string;
  id_card?: string;
  avatar_url?: string;
  cover_photo_url?: string;
};

export interface UserProfile {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  loyalty_points?: number;
  shipper_shop_id?: number | null;
}

export const userService = {
  getProfile: () => axiosClient.get<{ message: string; data: UserProfile }>("/user/profile"),
  updateProfile: (data: UpdateProfileData | FormData) =>
    axiosClient.put("/user/edit-profile", data),
  getFavorites: () => axiosClient.get("/user/me/favorites"),
  getViewedProducts: () => axiosClient.get("/user/me/viewed"),
};

import { publicAxios, axiosClient } from "@/shared/api/axiosClient";

export type LoginFormData = {
  email_or_phone: string;
  password: string;
};

export const authService = {
  /** Đăng nhập thường – không cần auth token */
  login: (data: LoginFormData) => publicAxios.post("/auth/login", data),

  /** Đăng xuất – cần gửi cookie refreshToken */
  logout: () => axiosClient.post("/auth/logout"),

  /** Lấy thông tin user hiện tại – dùng để verify token khi app khởi động */
  getMe: () => axiosClient.get("/user/profile"),

  /** Đăng nhập bằng Google – không cần auth token */
  googleLogin: (googleAccessToken: string) =>
    publicAxios.post("/auth/google", { googleAccessToken }),
};

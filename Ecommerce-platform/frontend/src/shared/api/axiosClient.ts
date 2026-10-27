import axios from "axios";

export const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshTokenRequest: Promise<string> | null = null;

const refreshToken = async () => {
  const response = await publicAxios.post("/auth/refresh");

  if (response.data.data) {
    const { accessToken } = response.data.data;

    const { store } = await import("@/app/stores/store");
    const { setToken } = await import("@/app/stores/slices/authSlice");

    store.dispatch(
      setToken({
        accessToken,
      }),
    );

    return accessToken;
  }

  throw new Error("Refresh token failed");
};

axiosClient.interceptors.request.use(async (config) => {
  const { store } = await import("@/app/stores/store");
  const accessToken = store.getState().auth.accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Nếu body là FormData, xóa Content-Type để trình duyệt tự set
  // multipart/form-data với boundary chính xác
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // tránh loop vô hạn
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;

    if (isUnauthorized) {
      originalRequest._retry = true;

      try {
        refreshTokenRequest = refreshTokenRequest || refreshToken();

        const accessToken = await refreshTokenRequest;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return axiosClient(originalRequest);
      } catch (refreshError) {
        const { store } = await import("@/app/stores/store");
        const { logout } = await import("@/app/stores/slices/authSlice");

        await publicAxios.post("/auth/logout").catch(() => {});
        store.dispatch(logout());

        return Promise.reject(refreshError);
      } finally {
        refreshTokenRequest = null;
      }
    }

    return Promise.reject(error);
  },
);

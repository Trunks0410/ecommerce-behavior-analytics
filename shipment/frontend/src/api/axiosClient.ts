import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_SHIPMENT_API_URL || "http://localhost:8090/api/v1";

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("shipper_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if expired/invalid
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("shipper_token");
        localStorage.removeItem("shipper_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

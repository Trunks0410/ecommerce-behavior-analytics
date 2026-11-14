import { useEffect } from "react";
import { useRoutes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getRoutes } from "./routes";
import { initAuthThunk, setToken } from "@/app/stores/slices/authSlice";
import type { AppDispatch, RootState } from "@/app/stores/store";
import toast, { Toaster } from "react-hot-toast";

// Override window.alert globally to replace native browser popups with beautiful toasts
if (typeof window !== "undefined") {
  window.alert = (message: any) => {
    const msgStr = String(message);
    const lower = msgStr.toLowerCase();
    const isSuccess = lower.includes("thành công") || lower.includes("success");
    const isError = lower.includes("lỗi") || lower.includes("thất bại") || lower.includes("error") || lower.includes("không hợp lệ") || lower.includes("bị khóa");

    if (isSuccess) {
      toast.success(msgStr, {
        duration: 4000,
        style: {
          border: "1px solid #bbf7d0",
          padding: "12px 16px",
          color: "#166534",
          background: "#f0fdf4",
          fontWeight: "600",
          borderRadius: "12px",
          boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
          fontSize: "13px",
        },
      });
    } else if (isError) {
      toast.error(msgStr, {
        duration: 4000,
        style: {
          border: "1px solid #fecdd3",
          padding: "12px 16px",
          color: "#9f1239",
          background: "#fff1f2",
          fontWeight: "600",
          borderRadius: "12px",
          boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
          fontSize: "13px",
        },
      });
    } else {
      toast(msgStr, {
        duration: 4000,
        icon: "ℹ️",
        style: {
          border: "1px solid #e2e8f0",
          padding: "12px 16px",
          color: "#1e293b",
          background: "#ffffff",
          fontWeight: "600",
          borderRadius: "12px",
          boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
          fontSize: "13px",
        },
      });
    }
  };
}

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { initialized, isAuthenticated, accessToken, user } = useSelector(
    (state: RootState) => state.auth,
  );
  
  let roleName = "GUEST";
  if (user) {
    roleName = typeof user.role === "string" 
      ? user.role.toUpperCase() 
      : user.role?.role_name?.toUpperCase() || "GUEST";
  }
  
  const routing = useRoutes(getRoutes(roleName));

  useEffect(() => {
    // 1. Đồng bộ token khi chuyển từ phân hệ Analytics sang (:5175 -> :5173)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");

    if (tokenFromUrl) {
      dispatch(setToken({ accessToken: tokenFromUrl }));
      dispatch(initAuthThunk());
      urlParams.delete("token");
      const remaining = urlParams.toString();
      const newUrl = window.location.pathname + (remaining ? `?${remaining}` : "");
      window.history.replaceState({}, document.title, newUrl);
    } else if (accessToken) {
      // 2. Luôn verify token khi ứng dụng khởi chạy nếu có accessToken trong store
      dispatch(initAuthThunk());
    }
  }, [dispatch, accessToken]);

  // Đang verify token → hiện loading
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="flex flex-col items-center gap-4">
          <span className="inline-block w-8 h-8 border-[3px] border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Đang tải...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {routing}
    </>
  );
}

export default App;

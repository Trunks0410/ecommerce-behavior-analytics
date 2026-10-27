import { useEffect } from "react";
import { useRoutes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getRoutes } from "./routes";
import { initAuthThunk } from "@/app/stores/slices/authSlice";
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
          border: "3px solid #10b981",
          padding: "16px",
          color: "#065f46",
          background: "#ecfdf5",
          fontWeight: "900",
          fontFamily: "sans-serif",
          borderRadius: "20px",
          boxShadow: "4px 4px 0px 0px #10b981",
          fontSize: "12px",
        },
      });
    } else if (isError) {
      toast.error(msgStr, {
        duration: 4000,
        style: {
          border: "3px solid #ef4444",
          padding: "16px",
          color: "#991b1b",
          background: "#fef2f2",
          fontWeight: "900",
          fontFamily: "sans-serif",
          borderRadius: "20px",
          boxShadow: "4px 4px 0px 0px #ef4444",
          fontSize: "12px",
        },
      });
    } else {
      toast(msgStr, {
        duration: 4000,
        icon: "ℹ️",
        style: {
          border: "3px solid #000",
          padding: "16px",
          color: "#000",
          background: "#fff",
          fontWeight: "900",
          fontFamily: "sans-serif",
          borderRadius: "20px",
          boxShadow: "4px 4px 0px 0px #000",
          fontSize: "12px",
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
    // Luôn verify token khi ứng dụng khởi chạy nếu có accessToken trong store
    if (accessToken) {
      dispatch(initAuthThunk());
    }
  }, [dispatch]);

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

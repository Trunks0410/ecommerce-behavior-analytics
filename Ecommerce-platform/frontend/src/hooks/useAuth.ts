import { useAppDispatch, useAppSelector } from "@/app/stores/hooks";
import { logout, clearError, initAuthThunk } from "@/app/stores/slices/authSlice";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error, accessToken } =
    useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Dù logout API lỗi vẫn xóa state cục bộ
    } finally {
      dispatch(logout());
      queryClient.clear();
      navigate("/auth/login");
    }
  };

  const handleClearError = () => dispatch(clearError());

  const handleInitAuth = () => dispatch(initAuthThunk());

  return {
    isAuthenticated,
    user,
    loading,
    error,
    accessToken,
    handleLogout,
    handleClearError,
    handleInitAuth,
  };
};

export default useAuth;

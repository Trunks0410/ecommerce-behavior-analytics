import { type PropsWithChildren } from "react";
import useAuth from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export type AuthGuardProps = PropsWithChildren & {
  allowedRoles?: string[];
  redirectTo?: string;
};

const AuthGuard = ({ children, allowedRoles, redirectTo = "/" }: AuthGuardProps) => {
  const { isAuthenticated, user, loading } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const hasTokenInUrl = !!urlParams.get("token");

  // Nếu đang có token từ URL hoặc đang loading xác thực → đợi tải xong, không vội redirect
  if (hasTokenInUrl || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="flex flex-col items-center gap-4">
          <span className="inline-block w-8 h-8 border-[3px] border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Đang đồng bộ phiên đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && user) {
    const userRoleName = typeof user.role === "object" && user.role !== null
      ? user.role.role_name
      : user.role;

    if (!userRoleName || !allowedRoles.map(r => r.toLowerCase()).includes(userRoleName.toLowerCase())) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <div>{children}</div>;
};

export default AuthGuard;

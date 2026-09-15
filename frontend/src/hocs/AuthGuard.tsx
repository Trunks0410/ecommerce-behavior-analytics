import { type PropsWithChildren } from "react";
import useAuth from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export type AuthGuardProps = PropsWithChildren & {
  allowedRoles?: string[];
};

const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user) {
    const userRoleName = typeof user.role === "object" && user.role !== null
      ? user.role.role_name
      : user.role;

    if (!userRoleName || !allowedRoles.map(r => r.toLowerCase()).includes(userRoleName.toLowerCase())) {
      return <Navigate to="/" replace />;
    }
  }

  return <div>{children}</div>;
};

export default AuthGuard;

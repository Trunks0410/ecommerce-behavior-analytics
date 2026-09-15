import { type PropsWithChildren } from "react";
import useAuth from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export type GuestGuardProps = PropsWithChildren & {};
const GuestGuard = ({ children }: GuestGuardProps) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <div>{children}</div>;
};
export default GuestGuard;

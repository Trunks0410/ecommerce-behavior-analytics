import { Outlet, useLocation } from "react-router-dom";
import Footer from "@/shared/components/layout/Footer";
import GuestGuard from "@/hocs/GuestGuard";

const AuthLayout = () => {
  const { pathname } = useLocation();
  const hideFooter = pathname === "/auth/login" || pathname === "/auth/register";

  return (
    <>
      <GuestGuard>
        <Outlet />
        {!hideFooter && <Footer />}
      </GuestGuard>
    </>
  );
};

export default AuthLayout;

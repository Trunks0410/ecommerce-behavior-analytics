import { Outlet } from "react-router-dom";
import Footer from "@/shared/components/layout/Footer";
import GuestGuard from "@/hocs/GuestGuard";

const AuthLayout = () => {
  return (
    <>
      <GuestGuard>
        <Outlet />
        <Footer />
      </GuestGuard>
    </>
  );
};

export default AuthLayout;

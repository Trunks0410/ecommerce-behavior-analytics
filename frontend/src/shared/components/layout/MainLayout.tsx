import Footer from "@/shared/components/layout/Footer";
import Header from "@/shared/components/layout/Header";
import ChatWidget from "@/shared/components/chat/ChatWidget";
import { Outlet, Navigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";

const MainLayout = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    const roleName = typeof user.role === "string"
      ? user.role.toLowerCase()
      : user.role?.role_name?.toLowerCase();

    if (roleName === "shipper") {
      return <Navigate to="/shipper" replace />;
    }
  }

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
};

export default MainLayout;

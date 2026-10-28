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
    <div className="min-h-screen flex flex-col bg-[#f5f5f5] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
};

export default MainLayout;

import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import ReconciliationPage from "./pages/ReconciliationPage";
import ProfilePage from "./pages/ProfilePage";

const getPageTitle = (pathname: string): string => {
  switch (pathname) {
    case "/":
      return "Tổng quan vận chuyển";
    case "/orders":
      return "Danh sách vận đơn";
    case "/reconciliation":
      return "Đối soát tiền COD";
    case "/profile":
      return "Cài đặt & Hồ sơ";
    default:
      return "UTE Express";
  }
};

const ProtectedLayout: React.FC = () => {
  const { token, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__spinner" />
        <p>Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const title = getPageTitle(location.pathname);

  return (
    <div className="portal-shell">
      {/* Sleek Dark Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Working Area */}
      <div className="portal-main-area">
        <TopBar
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="portal-content-body">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;

import { RouteObject } from "react-router-dom";
import MainLayout from "@/shared/components/layout/MainLayout";
import AuthLayout from "@/shared/components/layout/AuthLayout";
import AuthGuard from "@/hocs/AuthGuard";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import VerifyOTP from "@/pages/auth/VerifyOTP";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Profile from "@/pages/user/Profile";
import { ShipperDashboard } from "@/pages/shipper/ShipperDashboard";

import HomePage from "@/pages/shop/HomePage";
import VoucherCenterPage from "@/pages/shop/VoucherCenterPage";
import ProductListPage from "@/pages/shop/ProductListPage";
import ProductDetailPage from "@/pages/shop/ProductDetailPage";
import CartPage from "@/pages/shop/CartPage";
import CheckoutPage from "@/pages/shop/CheckoutPage";
import VNPayReturn from "@/pages/shop/VNPayReturn";
import VendorShopPage from "@/pages/shop/VendorShopPage";
import ShopListPage from "@/pages/shop/ShopListPage";
import OrderHistoryPage from "@/pages/user/OrderHistoryPage";
import OrderDetailPage from "@/pages/user/OrderDetailPage";
import ReviewPage from "@/pages/user/ReviewPage";
import VoucherWalletPage from "@/pages/user/VoucherWalletPage";
import VendorDashboard from "@/pages/vendor/VendorDashboard";
import ManagerDashboard from "@/pages/manager/ManagerDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import RegisterShopPage from "@/pages/shop/RegisterShopPage";
import { BlogListPage } from "@/pages/shop/BlogListPage";
import { BlogDetailPage } from "@/pages/shop/BlogDetailPage";

export const getRoutes = (role: string = "GUEST"): RouteObject[] => {

  const publicRoutes: RouteObject[] = [
    {
      path: "/",
      element: <MainLayout />,
      children: [
        {
          index: true,
          element: <HomePage />,
        },
        {
          path: "vouchers",
          element: <VoucherCenterPage />,
        },
        {
          path: "products",
          element: <ProductListPage />,
        },
        {
          path: "products/:id",
          element: <ProductDetailPage />,
        },
        {
          path: "shop/:id",
          element: <VendorShopPage />,
        },
        {
          path: "shops",
          element: <ShopListPage />,
        },
        {
          path: "profile",
          element: (
            <AuthGuard>
              <Profile />
            </AuthGuard>
          ),
        },
        {
          path: "user/vouchers",
          element: (
            <AuthGuard>
              <VoucherWalletPage />
            </AuthGuard>
          ),
        },
        {
          path: "cart",
          element: <CartPage />,
        },
        {
          path: "checkout",
          element: (
            <AuthGuard>
              <CheckoutPage />
            </AuthGuard>
          ),
        },
        {
          path: "payment/vnpay-return",
          element: <VNPayReturn />,
        },
        {
          path: "register-shop",
          element: (
            <AuthGuard>
              <RegisterShopPage />
            </AuthGuard>
          ),
        },
        {
          path: "orders",
          element: (
            <AuthGuard>
              <OrderHistoryPage />
            </AuthGuard>
          ),
        },
        {
          path: "orders/:id",
          element: (
            <AuthGuard>
              <OrderDetailPage />
            </AuthGuard>
          ),
        },
        {
          path: "reviews",
          element: (
            <AuthGuard>
              <ReviewPage />
            </AuthGuard>
          ),
        },
        {
          path: "blogs",
          element: <BlogListPage />,
        },
        {
          path: "blogs/:slug",
          element: <BlogDetailPage />,
        },
      ],
    },
    {
      path: "auth",
      element: <AuthLayout />,
      children: [
        {
          path: "login",
          element: <Login />,
        },
        {
          path: "register",
          element: <Register />,
        },
        {
          path: "verify-otp",
          element: <VerifyOTP />,
        },
        {
          path: "forgot-password",
          element: <ForgotPassword />,
        },
        {
          path: "logout",
        },
      ],
    },
    {
      path: "vendor",
      element: (
        <AuthGuard allowedRoles={["user", "vendor", "admin"]}>
          <VendorDashboard />
        </AuthGuard>
      ),
    },
    {
      path: "manager",
      element: (
        <AuthGuard allowedRoles={["manager", "admin"]}>
          <ManagerDashboard />
        </AuthGuard>
      ),
    },
    {
      path: "admin",
      element: (
        <AuthGuard allowedRoles={["admin"]}>
          <AdminDashboard />
        </AuthGuard>
      ),
    },
    {
      path: "shipper",
      element: (
        <AuthGuard allowedRoles={["shipper", "admin"]}>
          <ShipperDashboard />
        </AuthGuard>
      ),
    },
    {
      path: "*",
      element: <NotFound />,
    },
  ];

  const adminRoutes: RouteObject[] = [];

  switch (role) {
    case "ADMIN":
      return [...publicRoutes, ...adminRoutes];
    default:
      return publicRoutes;
  }
};

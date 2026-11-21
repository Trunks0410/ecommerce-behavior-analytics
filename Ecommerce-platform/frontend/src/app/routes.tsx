import { RouteObject } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "@/shared/components/layout/MainLayout";
import AuthLayout from "@/shared/components/layout/AuthLayout";
import AuthGuard from "@/hocs/AuthGuard";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import HomePage from "@/pages/shop/HomePage";
import ProductListPage from "@/pages/shop/ProductListPage";
import ProductDetailPage from "@/pages/shop/ProductDetailPage";

// Loading Fallback spinner
const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-[#ee4d2d] border-t-transparent rounded-full animate-spin" />
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

// Lazy-loaded secondary & heavy pages to optimize initial bundle size
const Register = lazy(() => import("@/pages/auth/Register"));
const VerifyOTP = lazy(() => import("@/pages/auth/VerifyOTP"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const Profile = lazy(() => import("@/pages/user/Profile"));
const NotificationsPage = lazy(() => import("@/pages/user/NotificationsPage"));
const VoucherCenterPage = lazy(() => import("@/pages/shop/VoucherCenterPage"));
const CartPage = lazy(() => import("@/pages/shop/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/shop/CheckoutPage"));
const VNPayReturn = lazy(() => import("@/pages/shop/VNPayReturn"));
const VendorShopPage = lazy(() => import("@/pages/shop/VendorShopPage"));
const ShopListPage = lazy(() => import("@/pages/shop/ShopListPage"));
const OrderHistoryPage = lazy(() => import("@/pages/user/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("@/pages/user/OrderDetailPage"));
const ReviewPage = lazy(() => import("@/pages/user/ReviewPage"));
const VoucherWalletPage = lazy(() => import("@/pages/user/VoucherWalletPage"));
const RegisterShopPage = lazy(() => import("@/pages/shop/RegisterShopPage"));
const BlogListPage = lazy(() => import("@/pages/shop/BlogListPage").then((m) => ({ default: m.BlogListPage })));
const BlogDetailPage = lazy(() => import("@/pages/shop/BlogDetailPage").then((m) => ({ default: m.BlogDetailPage })));
const VendorDashboard = lazy(() => import("@/pages/vendor/VendorDashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));

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
          element: withSuspense(VoucherCenterPage),
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
          element: withSuspense(VendorShopPage),
        },
        {
          path: "shops",
          element: withSuspense(ShopListPage),
        },
        {
          path: "profile",
          element: (
            <AuthGuard>
              {withSuspense(Profile)}
            </AuthGuard>
          ),
        },
        {
          path: "notifications",
          element: (
            <AuthGuard>
              {withSuspense(NotificationsPage)}
            </AuthGuard>
          ),
        },
        {
          path: "user/vouchers",
          element: (
            <AuthGuard>
              {withSuspense(VoucherWalletPage)}
            </AuthGuard>
          ),
        },
        {
          path: "cart",
          element: withSuspense(CartPage),
        },
        {
          path: "checkout",
          element: (
            <AuthGuard>
              {withSuspense(CheckoutPage)}
            </AuthGuard>
          ),
        },
        {
          path: "payment/vnpay-return",
          element: withSuspense(VNPayReturn),
        },
        {
          path: "register-shop",
          element: (
            <AuthGuard>
              {withSuspense(RegisterShopPage)}
            </AuthGuard>
          ),
        },
        {
          path: "orders",
          element: (
            <AuthGuard>
              {withSuspense(OrderHistoryPage)}
            </AuthGuard>
          ),
        },
        {
          path: "orders/:id",
          element: (
            <AuthGuard>
              {withSuspense(OrderDetailPage)}
            </AuthGuard>
          ),
        },
        {
          path: "reviews",
          element: (
            <AuthGuard>
              {withSuspense(ReviewPage)}
            </AuthGuard>
          ),
        },
        {
          path: "blogs",
          element: withSuspense(BlogListPage),
        },
        {
          path: "blogs/:slug",
          element: withSuspense(BlogDetailPage),
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
          element: withSuspense(Register),
        },
        {
          path: "verify-otp",
          element: withSuspense(VerifyOTP),
        },
        {
          path: "forgot-password",
          element: withSuspense(ForgotPassword),
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
          {withSuspense(VendorDashboard)}
        </AuthGuard>
      ),
    },
    {
      path: "admin/login",
      element: withSuspense(AdminLoginPage),
    },
    {
      path: "admin",
      element: (
        <AuthGuard allowedRoles={["admin"]} redirectTo="/admin/login">
          {withSuspense(AdminDashboard)}
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

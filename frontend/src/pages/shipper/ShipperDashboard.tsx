import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { useAppSelector, useAppDispatch } from "@/app/stores/hooks";
import { setUser } from "@/app/stores/slices/authSlice";
import {
  User,
  Package,
  PackageSearch,
  DollarSign,
  LogOut,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Menu,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";
import { getShipmentStatusLabel } from "@/shared/utils/statusUtils";
import useAuth from "@/hooks/useAuth";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useProfile } from "@/hooks/useUser";
import { userService } from "@/services/userService";
import { axiosClient } from "@/shared/api/axiosClient";
import { ShipperReconciliationTab } from "../user/ShipperReconciliationTab";
import { Link } from "react-router-dom";
import { shipmentService } from "@/services/shipmentService";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8088";
const FACEBOOK_DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0a0a0"><rect width="24" height="24" fill="%23e4e6eb"/><circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>`;

const HCMC_DISTRICTS = [
  "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12",
  "Thủ Đức", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình", "Tân Phú", "Bình Tân",
  "Bình Chánh", "Hóc Môn", "Củ Chi", "Nhà Bè", "Cần Giờ"
];

interface IUpdateProfileData {
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  operating_areas?: string[];
}

export const ShipperDashboard: React.FC = () => {
  const { handleLogout } = useAuth();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  const [activeTab, setActiveTab] = useState<"dashboard" | "orders" | "reconciliation" | "profile">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Orders and Stats state
  const [allShipperOrders, setAllShipperOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  // Delivery status change modal state
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [failedReason, setFailedReason] = useState("Không liên lạc được người mua");
  const [otherReason, setOtherReason] = useState("");
  const [collectedShippingFee, setCollectedShippingFee] = useState<number>(0);
  const [isBomRefusal, setIsBomRefusal] = useState<boolean>(true);
  const [hasPaidShippingFee, setHasPaidShippingFee] = useState<boolean>(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProofFile, setSuccessProofFile] = useState<File | null>(null);
  const [successProofPreview, setSuccessProofPreview] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState("");
  const [isSubmittingSuccess, setIsSubmittingSuccess] = useState(false);
  const successFileInputRef = useRef<HTMLInputElement>(null);

  // Profile update state
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useProfile({ enabled: !!user });

  const profileSchema = yup.object({
    full_name: yup.string().required("Tên không được để trống"),
    phone: yup
      .string()
      .matches(/^[0-9]{10}$/, "Số điện thoại phải có đúng 10 chữ số")
      .required("Số điện thoại không được để trống"),
    date_of_birth: yup
      .string()
      .required("Ngày sinh không được để trống")
      .test("is-valid-age", "Người dùng phải ít nhất 5 tuổi", (value) => {
        if (!value) return false;
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        return new Date(value) <= fiveYearsAgo;
      }),
    gender: yup.string().required("Giới tính không được để trống"),
    operating_areas: yup.array().of(yup.string().required()).optional(),
  });

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<IUpdateProfileData>({
    defaultValues: {
      full_name: (user as any)?.full_name || (user as any)?.fullName || "",
      phone: (user as any)?.phone || "",
      date_of_birth: (user as any)?.birthday
        ? (user as any).birthday.split("T")[0]
        : (user as any)?.dateOfBirth
          ? (user as any).dateOfBirth.split("T")[0]
          : "",
      gender: (user as any)?.gender?.toLowerCase() || "male",
      operating_areas: (() => {
        const raw = (user as any)?.profile?.operating_areas || (user as any)?.operating_areas;
        if (Array.isArray(raw)) return raw;
        try {
          if (typeof raw === "string") return JSON.parse(raw);
        } catch (e) {}
        return [];
      })(),
    },
    resolver: yupResolver(profileSchema) as any,
  });

  // Sync profile details when loaded
  useEffect(() => {
    const u = user as any;
    const p = profile as any;
    if (u || p) {
      const getAreas = () => {
        const raw = p?.operating_areas || u?.profile?.operating_areas || u?.operating_areas;
        if (Array.isArray(raw)) return raw;
        try {
          if (typeof raw === "string") return JSON.parse(raw);
        } catch (e) {}
        return [];
      };
      reset({
        full_name: p?.full_name || u?.full_name || u?.fullName || "",
        phone: p?.phone || u?.phone || "",
        date_of_birth: p?.birthday
          ? p.birthday.split("T")[0]
          : u?.birthday
            ? u.birthday.split("T")[0]
            : u?.dateOfBirth
              ? u.dateOfBirth.split("T")[0]
              : "",
        gender: p?.gender?.toLowerCase() || u?.gender?.toLowerCase() || "male",
        operating_areas: getAreas(),
      });
    }
  }, [user, profile, reset]);

  const fetchShipperOrders = async () => {
    try {
      setOrdersLoading(true);
      // Fetch 1000 orders to construct accurate statistics
      const response = await axiosClient.get("/orders/shipper?limit=1000");
      setAllShipperOrders(response.data.data.orders || []);
    } catch (error) {
      console.error("Error fetching shipper orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchShipperOrders();
  }, []);

  const handleUpdateStatus = async (orderId: number, status: string, note?: string, proofImageUrl?: string, collectedShippingFee?: number, isBom?: boolean) => {
    try {
      const order = allShipperOrders.find(o => o.id === orderId);
      if (order && order.shipment) {
        await shipmentService.updateShipmentStatus(order.shipment.id, { 
          status, 
          note, 
          proof_image_url: proofImageUrl,
          collected_shipping_fee: collectedShippingFee,
          is_bom: isBom
        });
      } else {
        throw new Error("Không tìm thấy thông tin vận đơn");
      }
      alert("Cập nhật trạng thái thành công!");
      fetchShipperOrders();
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    }
  };

  const handleFailDeliverySubmit = () => {
    if (!selectedOrderId) return;
    const finalReason = failedReason === "Lý do khác" ? otherReason : failedReason;
    if (failedReason === "Lý do khác" && !otherReason.trim()) {
      alert("Vui lòng nhập lý do khác");
      return;
    }
    const isRefusal = failedReason === "Người mua từ chối nhận hàng";
    const finalIsBom = isRefusal ? (isBomRefusal ? !hasPaidShippingFee : false) : undefined;
    const finalCollectedFee = isRefusal && isBomRefusal && hasPaidShippingFee ? 30000 : 0;

    handleUpdateStatus(
      selectedOrderId, 
      "FAILED", 
      finalReason, 
      undefined, 
      finalCollectedFee, 
      finalIsBom
    );
    setShowFailedModal(false);
    setSelectedOrderId(null);
    setOtherReason("");
    setCollectedShippingFee(0);
    setIsBomRefusal(true);
    setHasPaidShippingFee(false);
  };

  const handleSuccessProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSuccessProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSuccessProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerSuccessFileInput = () => {
    successFileInputRef.current?.click();
  };

  const handleSuccessDeliverySubmit = async () => {
    if (!selectedOrderId) return;
    if (!successProofFile) {
      alert("Vui lòng tải lên ảnh bằng chứng giao hàng thành công!");
      return;
    }

    setIsSubmittingSuccess(true);
    try {
      const formData = new FormData();
      formData.append("images", successProofFile);
      const uploadRes = await axiosClient.post("/user/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const uploadedUrls = uploadRes.data?.data;
      if (!uploadedUrls || uploadedUrls.length === 0) {
        throw new Error("Không thể upload ảnh");
      }

      await handleUpdateStatus(selectedOrderId, "DELIVERED", successNote, uploadedUrls[0]);
      
      setShowSuccessModal(false);
      setSelectedOrderId(null);
      setSuccessProofFile(null);
      setSuccessProofPreview(null);
      setSuccessNote("");
    } catch (error: any) {
      alert("Lỗi upload ảnh: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmittingSuccess(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const onUpdateProfileSubmit = async (data: IUpdateProfileData) => {
    const formData = new FormData();
    formData.append("full_name", data.full_name);
    formData.append("phone", data.phone);
    formData.append("date_of_birth", data.date_of_birth);
    formData.append("gender", data.gender);
    formData.append("operating_areas", JSON.stringify(data.operating_areas || []));

    if (selectedFile) {
      formData.append("avatar", selectedFile);
    }

    setIsUpdatingProfile(true);
    try {
      const response = await userService.updateProfile(formData);
      const updatedProfile = response.data.data;
      if (updatedProfile) {
        const updatedAreas = (() => {
          const raw = updatedProfile.operating_areas;
          if (Array.isArray(raw)) return raw;
          try {
            if (typeof raw === "string") return JSON.parse(raw);
          } catch (e) {}
          return [];
        })();
        dispatch(
          setUser({
            ...user!,
            fullName: updatedProfile.fullName,
            dateOfBirth: updatedProfile.dateOfBirth,
            gender: updatedProfile.gender,
            avatarUrl: updatedProfile.avatarUrl,
            profile: {
              ...user?.profile,
              ...updatedProfile,
              operating_areas: updatedAreas,
            },
          }),
        );
        reset({
          full_name: updatedProfile.fullName,
          phone: updatedProfile.phone,
          date_of_birth: updatedProfile.dateOfBirth?.split("T")[0] || "",
          gender: updatedProfile.gender,
          operating_areas: updatedAreas,
        });
        setAvatarPreview(null);
      }
      alert("Cập nhật thông tin thành công!");
      setSelectedFile(null);
    } catch (error) {
      alert("Cập nhật thông tin thất bại!");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getUserAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    const avatar = user?.avatarUrl || user?.profile?.avatar_url;
    if (!avatar) return FACEBOOK_DEFAULT_AVATAR;
    if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
    return `${API_URL}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
  };

  // ==========================================
  // STATISTICS CALCULATIONS
  // ==========================================
  const deliveredOrders = allShipperOrders.filter((o) => o.status === "DELIVERED");
  
  // Delivered Today
  const todayStr = new Date().toDateString();
  const deliveredToday = deliveredOrders.filter((o) => {
    const updatedDate = new Date(o.updated_at || o.updatedAt);
    return updatedDate.toDateString() === todayStr;
  });

  // Delivered This Month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const deliveredThisMonth = deliveredOrders.filter((o) => {
    const updatedDate = new Date(o.updated_at || o.updatedAt);
    return updatedDate.getMonth() === currentMonth && updatedDate.getFullYear() === currentYear;
  });

  // COD Cash tracking
  const heldCODCash = allShipperOrders
    .filter((o) => o.cod_status === "HELD_BY_SHIPPER")
    .reduce((sum, o) => sum + Number(o.cod_amount_collected || 0), 0);

  const confirmedCODCash = allShipperOrders
    .filter((o) => o.cod_status === "CONFIRMED")
    .reduce((sum, o) => sum + Number(o.cod_amount_collected || 0), 0);

  // Stats by day (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const dailyStats = last7Days.map((date) => {
    const dateStr = date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
    const matchStr = date.toDateString();
    const count = deliveredOrders.filter((o) => {
      const d = new Date(o.updated_at || o.updatedAt);
      return d.toDateString() === matchStr;
    }).length;
    return { label: dateStr, value: count };
  });

  // Stats by month (This Year)
  const monthStats = Array.from({ length: 12 }, (_, i) => {
    const count = deliveredOrders.filter((o) => {
      const d = new Date(o.updated_at || o.updatedAt);
      return d.getMonth() === i && d.getFullYear() === currentYear;
    }).length;
    return { label: `T${i + 1}`, value: count };
  });

  const filteredOrders = allShipperOrders.filter((order: any) => {
    if (!orderSearchTerm.trim()) return true;
    const term = orderSearchTerm.trim().toLowerCase();
    
    const shopOrderCode = (order.shop_order_code || "").toLowerCase();
    const parentOrderCode = (order.parentOrder?.order_code || "").toLowerCase();
    const orderId = String(order.id || "");
    
    return shopOrderCode.includes(term) || parentOrderCode.includes(term) || orderId === term;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Banner Header */}
      <div className="bg-white border-b-2 border-black sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 border-2 border-black rounded-lg active:translate-y-0.5"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary text-white flex items-center justify-center border-2 border-black rounded-lg font-black font-serif shadow-xs">
              S
            </div>
            <span className="font-serif text-lg font-black tracking-tighter text-black uppercase">
              SHIPPER PORTAL
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-black">{user?.fullName || "Shipper"}</span>
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
              Shipper hoạt động
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden shadow-xs">
            <img src={getUserAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Sidebar Nav */}
        <aside
          className={`bg-white border-r-2 border-black flex flex-col justify-between w-64 fixed md:sticky top-0 h-[calc(100vh-73px)] z-30 transition-transform duration-200 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex flex-col">
            {/* Sidebar User Details Card */}
            <div className="p-6 border-b-2 border-black bg-gray-50/50 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl border-[3px] border-black overflow-hidden shadow-brutal mb-3 relative group">
                <img src={getUserAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <h4 className="font-serif text-lg font-black text-black leading-tight">
                {user?.fullName || "Shipper"}
              </h4>
              <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded mt-2">
                Shipper
              </span>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col p-4 gap-2">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-black uppercase text-xs tracking-wider transition-all text-left ${
                  activeTab === "dashboard"
                    ? "bg-black text-white border-black shadow-subtle"
                    : "border-transparent hover:bg-gray-100 hover:border-black text-gray-700"
                }`}
              >
                <TrendingUp size={16} />
                Tổng quan & Thống kê
              </button>

              <button
                onClick={() => {
                  setActiveTab("orders");
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-black uppercase text-xs tracking-wider transition-all text-left ${
                  activeTab === "orders"
                    ? "bg-black text-white border-black shadow-subtle"
                    : "border-transparent hover:bg-gray-100 hover:border-black text-gray-700"
                }`}
              >
                <PackageSearch size={16} />
                Đơn hàng nhận giao
              </button>

              <button
                onClick={() => {
                  setActiveTab("reconciliation");
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-black uppercase text-xs tracking-wider transition-all text-left ${
                  activeTab === "reconciliation"
                    ? "bg-black text-white border-black shadow-subtle"
                    : "border-transparent hover:bg-gray-100 hover:border-black text-gray-700"
                }`}
              >
                <DollarSign size={16} />
                Đối soát COD
              </button>

              <button
                onClick={() => {
                  setActiveTab("profile");
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-black uppercase text-xs tracking-wider transition-all text-left ${
                  activeTab === "profile"
                    ? "bg-black text-white border-black shadow-subtle"
                    : "border-transparent hover:bg-gray-100 hover:border-black text-gray-700"
                }`}
              >
                <User size={16} />
                Thông tin cá nhân
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t-2 border-black flex flex-col gap-2">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-black rounded-xl font-black text-xs uppercase tracking-wider bg-white text-black hover:bg-gray-50 active:translate-y-0.5 shadow-xs"
            >
              Về Trang chủ
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-black rounded-xl font-black text-xs uppercase tracking-wider bg-red-100 text-red-600 hover:bg-red-200 active:translate-y-0.5"
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Sidebar Overlay for mobile screen */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-20 md:hidden"
          />
        )}

        {/* Page Content View */}
        <main className="flex-grow p-6 md:p-8 max-w-5xl mx-auto overflow-x-hidden">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="text-left">
                <h1 className="font-serif text-4xl font-black tracking-tight uppercase">Thống kê hoạt động</h1>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mt-1">Đánh giá hiệu suất giao hàng và dòng tiền COD</p>
              </div>

              {/* Statistics Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    label: "Giao hôm nay",
                    value: `${deliveredToday.length} đơn`,
                    desc: "Đã giao thành công",
                    icon: <CheckCircle2 className="text-green-500" />,
                  },
                  {
                    label: "Giao tháng này",
                    value: `${deliveredThisMonth.length} đơn`,
                    desc: "Trong tháng hiện tại",
                    icon: <Package className="text-blue-500" />,
                  },
                  {
                    label: "COD đang giữ",
                    value: `${heldCODCash.toLocaleString()}₫`,
                    desc: "Chờ nộp về bưu cục",
                    icon: <DollarSign className="text-yellow-600" />,
                  },
                  {
                    label: "COD đã đối soát",
                    value: `${confirmedCODCash.toLocaleString()}₫`,
                    desc: "Quản lý đã duyệt",
                    icon: <ShieldCheck className="text-teal-600" />,
                  },
                ].map((stat, i) => (
                  <Card
                    key={i}
                    className="p-6 border-2 border-black bg-white shadow-subtle hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border-2 border-black/5 flex items-center justify-center shrink-0">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                        {stat.label}
                      </p>
                      <p className="text-xl font-serif font-black text-black mt-1 leading-none">
                        {stat.value}
                      </p>
                      <p className="text-[9px] text-gray-400 font-bold mt-1.5 uppercase leading-none">
                        {stat.desc}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Graphical stats section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
                {/* 7 Days chart */}
                <Card className="p-6 border-2 border-black shadow-subtle">
                  <h3 className="font-serif text-lg font-black border-b border-black/10 pb-2 mb-4">
                    Số đơn giao 7 ngày qua
                  </h3>
                  <div className="h-48 flex items-end gap-3 px-2 pt-4">
                    {dailyStats.map((item, idx) => {
                      const maxVal = Math.max(...dailyStats.map((s) => s.value), 1);
                      const heightPercent = `${(item.value / maxVal) * 80}%`;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                          <span className="text-[10px] font-black text-black mb-1">{item.value}</span>
                          <div
                            style={{ height: heightPercent }}
                            className="w-full bg-primary border-2 border-black hover:bg-black transition-all"
                            title={`${item.value} đơn hàng`}
                          />
                          <span className="text-[9px] font-black text-gray-400 uppercase mt-2 tracking-wider">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 12 Months chart */}
                <Card className="p-6 border-2 border-black shadow-subtle">
                  <h3 className="font-serif text-lg font-black border-b border-black/10 pb-2 mb-4">
                    Số đơn giao theo tháng ({currentYear})
                  </h3>
                  <div className="h-48 flex items-end gap-1.5 px-1 pt-4">
                    {monthStats.map((item, idx) => {
                      const maxVal = Math.max(...monthStats.map((s) => s.value), 1);
                      const heightPercent = `${(item.value / maxVal) * 80}%`;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                          <span className="text-[9px] font-bold text-black mb-1 leading-none">{item.value}</span>
                          <div
                            style={{ height: heightPercent }}
                            className="w-full bg-blue-500 border-2 border-black hover:bg-black transition-all"
                            title={`${item.value} đơn hàng`}
                          />
                          <span className="text-[9px] font-black text-gray-400 uppercase mt-2 tracking-tighter leading-none">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Delivery Warning Panel */}
              {heldCODCash > 0 && (
                <div className="border-2 border-black bg-amber-50 rounded-2xl p-4 flex gap-3 text-left">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h5 className="font-black text-amber-800 text-xs uppercase tracking-wider">Thông báo bàn giao tiền mặt COD</h5>
                    <p className="text-xs text-amber-700 font-bold mt-1">
                      Bạn đang giữ {heldCODCash.toLocaleString()}₫ tiền mặt thu hộ. Hãy bàn giao đầy đủ số tiền này cho Quản lý bưu cục vào cuối ca làm việc để đối soát.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE ORDER LIST */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-black/10 flex justify-between items-center text-left">
                <div>
                  <h1 className="font-serif text-4xl font-black uppercase">Đơn hàng cần giao</h1>
                  <p className="text-gray-600 font-bold uppercase tracking-wider text-xs mt-1">
                    Quản lý và thực hiện tiến độ giao nhận đơn hàng được giao
                  </p>
                </div>
                <button
                  onClick={fetchShipperOrders}
                  disabled={ordersLoading}
                  className="p-2.5 border-2 border-black rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center active:translate-y-0.5 shadow-xs"
                  title="Làm mới danh sách"
                >
                  <RefreshCw size={16} className={ordersLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {/* Search input field */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm nhanh theo mã đơn hàng hoặc mã shop..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-xl px-12 py-3.5 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                />
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                {orderSearchTerm && (
                  <button
                    onClick={() => setOrderSearchTerm("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-black uppercase tracking-wider bg-gray-100 hover:bg-red-100 hover:text-red-600 border border-black rounded-lg transition-colors active:translate-y-0.5"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {ordersLoading ? (
                <p className="text-gray-500 italic py-10">Đang tải danh sách đơn hàng...</p>
              ) : allShipperOrders.length === 0 ? (
                <p className="text-gray-500 italic py-10 text-center bg-white border-2 border-black border-dashed rounded-2xl font-bold uppercase">
                  Không có đơn hàng nào cần xử lý.
                </p>
              ) : filteredOrders.length === 0 ? (
                <p className="text-gray-500 italic py-10 text-center bg-white border-2 border-black border-dashed rounded-2xl font-bold uppercase">
                  Không tìm thấy đơn hàng nào khớp với "{orderSearchTerm}".
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {filteredOrders.map((order: any) => {
                    const shippingAddress = order.parentOrder?.shipping_address || "Chưa có địa chỉ";
                    const paymentMethod = order.parentOrder?.payment_method || "COD";
                    const clientNote = order.parentOrder?.note || "Không có ghi chú";

                    const statusColors: Record<string, string> = {
                      PENDING_PICKUP: "bg-blue-100 text-blue-700 border-blue-200",
                      PICKED_UP: "bg-cyan-100 text-cyan-700 border-cyan-200",
                      IN_TRANSIT: "bg-purple-100 text-purple-700 border-purple-200",
                      OUT_FOR_DELIVERY: "bg-yellow-100 text-yellow-700 border-yellow-200",
                      DELIVERED: "bg-green-100 text-green-700 border-green-200",
                      FAILED: "bg-red-100 text-red-700 border-red-200",
                      RETURN_PENDING: "bg-pink-100 text-pink-700 border-pink-200",
                      RETURNED: "bg-gray-100 text-gray-700 border-gray-200",
                      CANCELLED: "bg-red-100 text-red-700 border-red-200",
                    };
                    
                    const shipmentStatus = order.shipment?.status || order.status;

                    return (
                      <Card
                        key={order.id}
                        className="p-6 border-2 border-black flex flex-col gap-4 shadow-subtle text-left"
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b-2 border-black/10">
                          <div>
                            <span className="text-xs font-black uppercase text-gray-500">Mã đơn hàng:</span>
                            <span className="ml-2 font-mono font-black text-black">{order.shop_order_code}</span>
                          </div>
                          <span
                            className={`px-3 py-1 border text-[10px] font-black uppercase tracking-widest rounded-lg ${
                              statusColors[shipmentStatus] || "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {getShipmentStatusLabel(shipmentStatus)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-gray-700">
                          <div>
                            <p className="mb-1">
                              <span className="text-black uppercase text-[10px] font-black">Cửa hàng:</span>{" "}
                              {order.shop?.shop_name}
                            </p>
                            <p className="mb-1">
                              <span className="text-black uppercase text-[10px] font-black">Địa chỉ giao hàng:</span>{" "}
                              {shippingAddress}
                            </p>
                            <p className="mb-1">
                              <span className="text-black uppercase text-[10px] font-black">Ghi chú khách:</span>{" "}
                              {clientNote}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1">
                              <span className="text-black uppercase text-[10px] font-black">Thanh toán:</span>{" "}
                              {paymentMethod}
                            </p>
                            <p className="mb-1">
                              <span className="text-black uppercase text-[10px] font-black">Tiền thu hộ (COD):</span>{" "}
                              <span className="text-primary font-black text-sm">
                                {Number(order.final_amount).toLocaleString()}₫
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Items list */}
                        <div className="border-t border-black/5 pt-3">
                          <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Chi tiết sản phẩm</p>
                          <div className="space-y-2">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-center text-xs">
                                <span className="font-bold">
                                  {item.product_name} <span className="text-gray-400">x{item.quantity}</span>
                                </span>
                                <span className="font-mono text-gray-500 font-bold">
                                  {Number(item.unit_price).toLocaleString()}₫
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action controls */}
                        <div className="flex justify-end gap-3 pt-4 border-t-2 border-dashed border-black/10">
                          {shipmentStatus === "PENDING_PICKUP" && !order.shipper_id && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, "PENDING_PICKUP")}
                              className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-black transition-all active:translate-y-[2px]"
                            >
                              Nhận giao hàng
                            </button>
                          )}

                          {shipmentStatus === "PENDING_PICKUP" && order.shipper_id === user?.id && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, "PICKED_UP")}
                              className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-cyan-500 text-white hover:bg-black transition-all active:translate-y-[2px]"
                            >
                              Xác nhận đã lấy hàng
                            </button>
                          )}

                          {shipmentStatus === "PICKED_UP" && order.shipper_id === user?.id && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, "IN_TRANSIT")}
                              className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-purple-500 text-white hover:bg-black transition-all active:translate-y-[2px]"
                            >
                              Bắt đầu luân chuyển
                            </button>
                          )}

                           {shipmentStatus === "IN_TRANSIT" && order.shipper_id === user?.id && (
                            order.status === "RETURN_PENDING" ? (
                              <button
                                onClick={() => handleUpdateStatus(order.id, "RETURNED")}
                                className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-pink-600 text-white hover:bg-black transition-all active:translate-y-[2px]"
                              >
                                Xác nhận hoàn trả cho Shop
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(order.id, "OUT_FOR_DELIVERY")}
                                className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-black transition-all active:translate-y-[2px]"
                              >
                                Bắt đầu đi giao
                              </button>
                            )
                          )}
 
                           {shipmentStatus === "OUT_FOR_DELIVERY" && order.shipper_id === user?.id && (
                             <>
                               <button
                                 onClick={() => {
                                   setSelectedOrderId(order.id);
                                   setShowSuccessModal(true);
                                 }}
                                 className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-green-500 text-white hover:bg-black transition-all active:translate-y-[2px]"
                               >
                                 Giao thành công
                               </button>
                               <button
                                 onClick={() => {
                                   setSelectedOrderId(order.id);
                                   setShowFailedModal(true);
                                 }}
                                 className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-red-500 text-white hover:bg-black transition-all active:translate-y-[2px]"
                               >
                                 Giao thất bại
                               </button>
                             </>
                           )}
 
                           {shipmentStatus === "FAILED" && order.shipper_id === user?.id && (
                             order.status === "RETURN_PENDING" ? (
                               <button
                                 onClick={() => handleUpdateStatus(order.id, "PICKED_UP")}
                                 className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-pink-500 text-white hover:bg-black transition-all active:translate-y-[2px]"
                               >
                                 Bắt đầu chuyển hoàn
                               </button>
                             ) : (
                               <button
                                 onClick={() => handleUpdateStatus(order.id, "OUT_FOR_DELIVERY")}
                                 className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-black transition-all active:translate-y-[2px]"
                               >
                                 Giao lại đơn hàng (Lần {(order.delivery_attempts ?? 0) + 1})
                               </button>
                             )
                           )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-4 border-black rounded-3xl shadow-brutal max-w-md w-full p-6 animate-in zoom-in-95 text-left">
            <h3 className="font-serif text-2xl font-black uppercase mb-4 border-b-2 border-black pb-2 text-green-600">
              Xác nhận giao thành công
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Ảnh bằng chứng (Bắt buộc)
                </label>
                <div 
                  onClick={triggerSuccessFileInput}
                  className="border-2 border-dashed border-black/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors h-40 relative overflow-hidden"
                >
                  {successProofPreview ? (
                    <img src={successProofPreview} alt="Proof" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <CheckCircle2 className="text-green-600" size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-500">Nhấn để tải lên ảnh chụp</span>
                    </>
                  )}
                  <input
                    type="file"
                    ref={successFileInputRef}
                    onChange={handleSuccessProofChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Ghi chú (Tùy chọn)
                </label>
                <Input
                  placeholder="Người nhận đã kiểm hàng..."
                  value={successNote}
                  onChange={(e) => setSuccessNote(e.target.value)}
                  className="w-full text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSelectedOrderId(null);
                  setSuccessProofFile(null);
                  setSuccessProofPreview(null);
                  setSuccessNote("");
                }}
                disabled={isSubmittingSuccess}
                className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-100 transition-all active:translate-y-[2px]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSuccessDeliverySubmit}
                disabled={isSubmittingSuccess}
                className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-green-500 text-white hover:bg-black transition-all active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingSuccess && <RefreshCw size={14} className="animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

          {/* TAB 3: AUTOMATED COD RECONCILIATION */}
          {activeTab === "reconciliation" && (
            <div className="space-y-6">
              <ShipperReconciliationTab />
            </div>
          )}

          {/* TAB 4: PERSONAL PROFILE MANAGEMENT */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="text-left">
                <h1 className="font-serif text-4xl font-black tracking-tight uppercase">Thông tin cá nhân</h1>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mt-1">Cấu hình hồ sơ cá nhân và bưu cục trực thuộc</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                {/* Left Column: avatar upload */}
                <div className="lg:col-span-1">
                  <Card className="p-6 border-2 border-black shadow-subtle flex flex-col items-center text-center">
                    <div
                      onClick={triggerFileInput}
                      className="w-32 h-32 rounded-2xl border-[3px] border-black overflow-hidden shadow-brutal mb-4 cursor-pointer relative group"
                    >
                      <img src={getUserAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-black uppercase tracking-wider">Thay đổi</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <h3 className="font-serif text-lg font-black text-black leading-tight">
                      {user?.fullName || "Shipper"}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold font-mono mt-1">{user?.email}</p>
                    <button
                      onClick={triggerFileInput}
                      className="mt-4 px-4 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider hover:bg-gray-100 transition-colors"
                    >
                      Chọn ảnh đại diện
                    </button>
                  </Card>
                </div>

                {/* Right Column: details form */}
                <div className="lg:col-span-2">
                  <Card className="p-6 border-2 border-black shadow-subtle">
                    <form onSubmit={handleSubmit(onUpdateProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Controller
                          control={control}
                          name="full_name"
                          render={({ field, fieldState }) => (
                            <div>
                              <Input
                                label="Họ và tên"
                                id="full_name"
                                value={field.value}
                                onChange={field.onChange}
                              />
                              {fieldState.error?.message && (
                                <p className="text-red-500 text-xs font-bold mt-1">{fieldState.error.message}</p>
                              )}
                            </div>
                          )}
                        />

                        <Controller
                          control={control}
                          name="phone"
                          render={({ field, fieldState }) => (
                            <div>
                              <Input
                                label="Số điện thoại"
                                id="phone"
                                value={field.value}
                                onChange={field.onChange}
                              />
                              {fieldState.error?.message && (
                                <p className="text-red-500 text-xs font-bold mt-1">{fieldState.error.message}</p>
                              )}
                            </div>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Email" id="email" type="email" value={user?.email || ""} disabled />

                        <Controller
                          control={control}
                          name="date_of_birth"
                          render={({ field, fieldState }) => (
                            <div>
                              <Input
                                label="Ngày sinh"
                                id="dob"
                                type="date"
                                value={field.value}
                                onChange={field.onChange}
                                max={new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split("T")[0]}
                              />
                              {fieldState.error?.message && (
                                <p className="text-red-500 text-xs font-bold mt-1">{fieldState.error.message}</p>
                              )}
                            </div>
                          )}
                        />
                      </div>



                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 block">Giới tính</label>
                        <div className="flex items-center space-x-6 pt-1">
                          {["male", "female", "other"].map((g) => (
                            <label key={g} className="flex items-center space-x-2 cursor-pointer text-xs font-bold uppercase">
                              <Controller
                                control={control}
                                name="gender"
                                render={({ field }) => (
                                  <input
                                    type="radio"
                                    name="gender"
                                    value={g}
                                    checked={field.value === g}
                                    onChange={field.onChange}
                                    className="w-4 h-4 text-primary focus:ring-primary border-black accent-primary"
                                  />
                                )}
                              />
                              <span>{g === "male" ? "Nam" : g === "female" ? "Nữ" : "Khác"}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Operating Areas Dropdown List */}
                      <div className="space-y-4 border-t border-black/10 pt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 block">
                          Khu vực hoạt động đăng ký
                        </label>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                          Hệ thống sẽ tự động gán đơn hàng thuộc các khu vực này cho bạn
                        </p>
                        <Controller
                          control={control}
                          name="operating_areas"
                          render={({ field }) => {
                            const currentSelected = field.value || [];
                            
                            const handleAddArea = (area: string) => {
                              if (area && !currentSelected.includes(area)) {
                                field.onChange([...currentSelected, area]);
                              }
                            };
                            
                            const handleRemoveArea = (area: string) => {
                              field.onChange(currentSelected.filter((a) => a !== area));
                            };
                            
                            return (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                                      Thành phố
                                    </label>
                                    <select
                                      defaultValue="HCMC"
                                      className="w-full bg-white border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                    >
                                      <option value="HCMC">Thành phố Hồ Chí Minh</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                                      Khu vực (Quận/Huyện)
                                    </label>
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        handleAddArea(e.target.value);
                                        e.target.value = ""; // Reset
                                      }}
                                      className="w-full bg-white border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                    >
                                      <option value="" disabled>-- Chọn Quận/Huyện --</option>
                                      {HCMC_DISTRICTS.map((dist) => (
                                        <option key={dist} value={dist} disabled={currentSelected.includes(dist)}>
                                          {dist}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Tags of selected areas */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-gray-400 block">
                                    Khu vực đã chọn ({currentSelected.length})
                                  </label>
                                  {currentSelected.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic font-bold">Chưa chọn khu vực nào</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {currentSelected.map((area: string) => (
                                        <span
                                          key={area}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-primary/10 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs"
                                        >
                                          {area}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveArea(area)}
                                            className="text-gray-500 hover:text-red-600 transition-colors"
                                          >
                                            <X size={12} className="stroke-[3]" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }}
                        />
                      </div>

                      <div className="pt-4 border-t border-black/10 flex justify-end">
                        <Button type="submit" disabled={isUpdatingProfile} className="w-full md:w-auto">
                          {isUpdatingProfile ? "Đang cập nhật..." : "Cập nhật hồ sơ"}
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Failure Modal */}
      {showFailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-4 border-black rounded-3xl shadow-brutal max-w-md w-full p-6 animate-in zoom-in-95 text-left">
            <h3 className="font-serif text-2xl font-black uppercase mb-4 border-b-2 border-black pb-2 text-red-600">
              Lý do giao hàng thất bại
            </h3>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                Chọn lý do
              </label>
              <div className="flex flex-col gap-2">
                {[
                  "Không liên lạc được người mua",
                  "Người mua từ chối nhận hàng",
                  "Sai địa chỉ giao hàng",
                  "Lý do khác",
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 p-3 border-2 border-black/10 rounded-xl cursor-pointer hover:border-black transition-all"
                  >
                    <input
                      type="radio"
                      name="failedReason"
                      value={reason}
                      checked={failedReason === reason}
                      onChange={(e) => setFailedReason(e.target.value)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs font-bold text-gray-800">{reason}</span>
                  </label>
                ))}
              </div>

              {failedReason === "Lý do khác" && (
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    Chi tiết lý do khác
                  </label>
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Vui lòng nhập lý do cụ thể..."
                    className="w-full border-2 border-black p-3 rounded-xl focus:border-primary outline-none text-xs font-bold min-h-[80px]"
                  />
                </div>
              )}

              {failedReason === "Người mua từ chối nhận hàng" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    Phân loại từ chối nhận hàng
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 p-3 border-2 border-black/10 rounded-xl cursor-pointer hover:border-black transition-all">
                      <input
                        type="radio"
                        name="refusalType"
                        checked={isBomRefusal === false}
                        onChange={() => setIsBomRefusal(false)}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <span className="text-xs font-black text-gray-800">Lý do chính đáng</span>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Sản phẩm lỗi, giao sai hàng, hàng hỏng. (Miễn phí ship, không tính bom)</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border-2 border-black/10 rounded-xl cursor-pointer hover:border-black transition-all">
                      <input
                        type="radio"
                        name="refusalType"
                        checked={isBomRefusal === true}
                        onChange={() => setIsBomRefusal(true)}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <span className="text-xs font-black text-gray-800">Lý do không chính đáng (Bom hàng)</span>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Đổi ý, không thích nhận hàng không có lý do. (Có tính bom, yêu cầu trả phí ship)</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {failedReason === "Người mua từ chối nhận hàng" && isBomRefusal && 
               (allShipperOrders.find(o => o.id === selectedOrderId)?.parentOrder?.payment_method === "COD" || 
                allShipperOrders.find(o => o.id === selectedOrderId)?.payment_method === "COD" ||
                !allShipperOrders.find(o => o.id === selectedOrderId)?.parentOrder?.payment_method) && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    Thu tiền phí vận chuyển 30,000đ từ khách hàng
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 p-3 border-2 border-black/10 rounded-xl cursor-pointer hover:border-black transition-all">
                      <input
                        type="radio"
                        name="shippingFeePaid"
                        checked={hasPaidShippingFee === true}
                        onChange={() => setHasPaidShippingFee(true)}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <span className="text-xs font-black text-gray-800">Khách đã trả 30.000đ phí ship</span>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Người nhận đồng ý thanh toán phí vận chuyển. (Không tính phạt bom)</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border-2 border-black/10 rounded-xl cursor-pointer hover:border-black transition-all">
                      <input
                        type="radio"
                        name="shippingFeePaid"
                        checked={hasPaidShippingFee === false}
                        onChange={() => setHasPaidShippingFee(false)}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <span className="text-xs font-black text-gray-800">Khách không trả phí ship (0đ)</span>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Người nhận từ chối trả phí vận chuyển. (Tính phạt bom hàng)</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-black/10">
              <button
                type="button"
                onClick={() => {
                  setShowFailedModal(false);
                  setSelectedOrderId(null);
                  setOtherReason("");
                }}
                className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-100 transition-all active:translate-y-[2px]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleFailDeliverySubmit}
                className="px-5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-widest bg-red-500 text-white hover:bg-black transition-all active:translate-y-[2px]"
              >
                Xác nhận thất bại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

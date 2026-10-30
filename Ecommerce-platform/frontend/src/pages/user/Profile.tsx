import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  Star,
  Ticket,
  Map,
  Store,
  ShieldCheck,
  Camera,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  Check,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Lock,
} from "lucide-react";

import { useAppSelector, useAppDispatch } from "@/app/stores/hooks";
import { setUser } from "@/app/stores/slices/authSlice";
import { userService } from "@/services/userService";
import useAuth from "@/hooks/useAuth";

import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from "@/hooks/useAddresses";
import { useProfile, useFavorites, useViewedProducts } from "@/hooks/useUser";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { formatPrice } from "@/shared/utils/format";
import { useLanguage } from "@/shared/context/LanguageContext";
import { getCurrentLocale } from "@/shared/utils/format";
import ProductCard from "@/shared/components/ui/ProductCard";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8088";

interface IUpdateProfileData {
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
}

const addressSchema = yup.object().shape({
  recipient_name: yup.string().required("Vui lòng nhập tên người nhận"),
  phone_number: yup.string().required("Vui lòng nhập số điện thoại"),
  address_line: yup.string().required("Vui lòng nhập địa chỉ chi tiết"),
});

const schema = yup.object({
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
});

const Profile = () => {
  const { handleLogout } = useAuth();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();



  const hasShop =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "vendor"
      : user?.role?.role_name?.toLowerCase() === "vendor") || user?.isVendor;

  const isManager =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "manager"
      : user?.role?.role_name?.toLowerCase() === "manager") ||
    user?.email?.includes("manager");

  const isAdmin =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "admin"
      : user?.role?.role_name?.toLowerCase() === "admin") ||
    user?.email?.includes("admin");

  const [activeTab, setActiveTab] = useState<
    "overview" | "addresses" | "favorites" | "viewed" | "points"
  >(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "favorites") return "favorites";
    if (tabParam === "viewed") return "viewed";
    if (tabParam === "points") return "points";
    if (tabParam === "addresses") return "addresses";
    return "overview";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "favorites") setActiveTab("favorites");
    else if (tabParam === "viewed") setActiveTab("viewed");
    else if (tabParam === "points") setActiveTab("points");
    else if (tabParam === "addresses") setActiveTab("addresses");
  }, [searchParams]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
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
    },
    resolver: yupResolver(schema),
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Address logic
  const { data: addresses, isLoading: isAddressesLoading } = useAddresses();
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  // Profile data hooks
  const { data: profile } = useProfile({ enabled: !!user });
  const { data: favorites } = useFavorites({ enabled: !!user }) as { data: any[] };
  const { data: viewedProducts } = useViewedProducts({ enabled: !!user }) as { data: any[] };
  const { data: systemSettings } = useSystemSettings() as any;

  useEffect(() => {
    const u = user as any;
    const p = profile as any;
    if (u || p) {
      reset({
        full_name: p?.profile?.full_name || p?.full_name || u?.profile?.full_name || u?.fullName || "",
        phone: p?.phone || u?.phone || "",
        date_of_birth: p?.birthday
          ? p.birthday.split("T")[0]
          : u?.birthday
            ? u.birthday.split("T")[0]
            : u?.dateOfBirth
              ? u.dateOfBirth.split("T")[0]
              : "",
        gender: p?.gender?.toLowerCase() || u?.gender?.toLowerCase() || "male",
      });
    }
  }, [user, profile, reset]);

  const {
    register: registerAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddress,
    formState: { errors: addressErrors },
  } = useForm({
    resolver: yupResolver(addressSchema),
  });

  const onSubmitAddress = async (data: any) => {
    try {
      if (editingAddressId) {
        await updateAddressMutation.mutateAsync({
          id: editingAddressId,
          payload: {
            recipient_name: data.recipient_name,
            phone_number: data.phone_number,
            address_line: data.address_line,
          },
        });
        alert("Cập nhật địa chỉ thành công!");
      } else {
        await createAddressMutation.mutateAsync({
          recipient_name: data.recipient_name,
          phone_number: data.phone_number,
          address_line: data.address_line,
          is_default: addresses?.length === 0,
        });
        alert("Thêm địa chỉ thành công!");
      }
      setIsAddingAddress(false);
      setEditingAddressId(null);
      resetAddress();
    } catch (error) {
      alert(editingAddressId ? "Cập nhật địa chỉ thất bại!" : "Thêm địa chỉ thất bại!");
    }
  };

  const handleEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    resetAddress({
      recipient_name: addr.recipient_name,
      phone_number: addr.phone_number,
      address_line: addr.address_line,
    });
    setIsAddingAddress(true);
  };

  const handleDeleteAddress = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) {
      try {
        await deleteAddressMutation.mutateAsync(id);
        alert("Xóa địa chỉ thành công!");
      } catch (error) {
        alert("Xóa địa chỉ thất bại!");
      }
    }
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      await updateAddressMutation.mutateAsync({
        id,
        payload: { is_default: true },
      });
      alert("Đã đặt làm địa chỉ mặc định!");
    } catch (error) {
      alert("Cập nhật thất bại!");
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

  const onSubmit = async (data: IUpdateProfileData) => {
    setIsUpdating(true);
    const formData = new FormData();
    formData.append("full_name", data.full_name);
    formData.append("phone", data.phone);
    formData.append("date_of_birth", data.date_of_birth);
    formData.append("gender", data.gender);

    if (selectedFile) {
      formData.append("avatar", selectedFile);
    }
    try {
      const response = await userService.updateProfile(formData);
      const updatedProfile = response.data.data;
      if (updatedProfile) {
        dispatch(
          setUser({
            ...user!,
            fullName: updatedProfile.fullName,
            phone: updatedProfile.phone,
            dateOfBirth: updatedProfile.dateOfBirth,
            gender: updatedProfile.gender,
            avatarUrl: updatedProfile.avatarUrl,
            profile: {
              ...user?.profile,
              ...updatedProfile,
            },
          }),
        );
        reset({
          full_name: updatedProfile.fullName,
          phone: updatedProfile.phone,
          date_of_birth: updatedProfile.dateOfBirth?.split("T")[0] || "",
          gender: updatedProfile.gender,
        });
        setAvatarPreview(null);
      }
      alert("Cập nhật thông tin thành công!");
      setSelectedFile(null);
    } catch (error) {
      alert("Cập nhật thông tin thất bại!");
    } finally {
      setIsUpdating(false);
    }
  };

  const currentAvatarUrl =
    avatarPreview ||
    (user?.avatarUrl || (profile as any)?.profile?.avatar_url
      ? (user?.avatarUrl || (profile as any)?.profile?.avatar_url).startsWith("http")
        ? (user?.avatarUrl || (profile as any)?.profile?.avatar_url)
        : `${API_URL}${user?.avatarUrl || (profile as any)?.profile?.avatar_url}`
      : `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0a0a0"><rect width="24" height="24" fill="%23e4e6eb"/><circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>`);

  const displayName =
    (user as any)?.full_name || user?.fullName || user?.username || user?.email?.split("@")[0] || "Khách hàng";

  const defaultAddress = addresses?.find((a: any) => a.is_default) || addresses?.[0];

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-slate-950 pb-16">
      {/* ================= 1. FACEBOOK PROFILE HEADER ================= */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-6xl mx-auto">
          {/* Panoramic Cover Photo */}
          <div className="relative h-48 sm:h-72 md:h-80 w-full rounded-b-2xl overflow-hidden bg-gradient-to-r from-orange-400 via-rose-500 to-amber-500">
            <img
              src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1600"
              alt="Cover"
              className="w-full h-full object-cover opacity-85"
            />
            {/* Edit Cover Button */}
            <button
              onClick={() => alert("Tính năng đổi ảnh bìa đang được cập nhật!")}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
            >
              <Camera size={15} />
              <span className="hidden sm:inline">{t("edit_cover")}</span>
            </button>
          </div>

          {/* Profile Bar: Avatar + Name + Buttons */}
          <div className="px-6 pb-4 pt-4">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
              {/* Left: Circular Avatar & Name */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-left">
                {/* Avatar with Camera badge */}
                <div className="relative group -mt-16 sm:-mt-20 z-10">
                  <div
                    onClick={triggerFileInput}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-slate-900 overflow-hidden shadow-xl bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    <img
                      src={currentAvatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <button
                    onClick={triggerFileInput}
                    className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-100 flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 cursor-pointer transition-colors"
                    title="Đổi ảnh đại diện"
                  >
                    <Camera size={18} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                {/* Name & Bio */}
                <div className="mb-2 pt-2 md:pt-0">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">
                      {displayName}
                    </h1>
                    <CheckCircle2 size={20} className="text-[#ee4d2d] fill-[#ee4d2d]/20" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md">
                    {t("profile_bio")} • {user?.email}
                  </p>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setActiveTab("overview")}
                  className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Edit3 size={15} />
                  <span>{t("edit_profile")}</span>
                </button>
                <Link
                  to="/orders"
                  className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Package size={15} />
                  <span>{t("purchase_orders")}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>

            {/* Horizontal Facebook Navigation Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2 border-t border-gray-100 dark:border-slate-800 mt-6 pt-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "overview"
                    ? "border-[#ee4d2d] text-[#ee4d2d]"
                    : "border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-t-lg"
                }`}
              >
                {t("profile_tab_overview")}
              </button>

              <button
                onClick={() => setActiveTab("addresses")}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "addresses"
                    ? "border-[#ee4d2d] text-[#ee4d2d]"
                    : "border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-t-lg"
                }`}
              >
                {t("profile_tab_addresses")}
              </button>

              <button
                onClick={() => setActiveTab("favorites")}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "favorites"
                    ? "border-[#ee4d2d] text-[#ee4d2d]"
                    : "border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-t-lg"
                }`}
              >
                {t("profile_tab_favorites")} ({favorites?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab("viewed")}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "viewed"
                    ? "border-[#ee4d2d] text-[#ee4d2d]"
                    : "border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-t-lg"
                }`}
              >
                {t("viewed_label")} ({viewedProducts?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab("points")}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "points"
                    ? "border-[#ee4d2d] text-[#ee4d2d]"
                    : "border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-t-lg"
                }`}
              >
                {t("profile_tab_vouchers")}
              </button>


            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. FACEBOOK 2-COLUMN LAYOUT ================= */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Facebook "Giới thiệu" Card (4 Columns) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card Giới Thiệu (Intro) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-slate-100">
                {t("profile_tab_overview")}
              </h3>

              <div className="space-y-3 text-xs text-gray-600 dark:text-slate-300">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400 shrink-0" />
                  <span className="truncate">{user?.email || "Chưa có email"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-gray-400 shrink-0" />
                  <span>{(user as any)?.phone || "Chưa thêm số điện thoại"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400 shrink-0" />
                  <span>
                    {(user as any)?.date_of_birth || (user as any)?.dateOfBirth
                      ? new Date(
                          (user as any)?.date_of_birth || (user as any)?.dateOfBirth
                        ).toLocaleDateString(getCurrentLocale())
                      : "Chưa cập nhật ngày sinh"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User size={16} className="text-gray-400 shrink-0" />
                  <span>
                    {user?.gender === "female" ? "Nữ" : user?.gender === "male" ? "Nam" : "Khác"}
                  </span>
                </div>
                {defaultAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {defaultAddress.address_line} ({defaultAddress.recipient_name})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-amber-500 shrink-0" />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {t("member_vip")} • MeeMart Gold
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("overview")}
                className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
              >
                {t("edit_profile")}
              </button>
            </div>

            {/* Card Điểm Thưởng & Ví Xu */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl p-5 shadow-xs relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
                  MeeMart Xu & Điểm Thưởng
                </span>
                <div className="text-3xl font-extrabold mt-1">
                  {(profile as any)?.loyalty_points || 0} <span className="text-sm font-semibold">Xu</span>
                </div>
                <p className="text-[11px] text-white/90 mt-1">
                  Đổi xu giảm ngay đến 100.000₫ cho mỗi đơn hàng.
                </p>
                <div className="mt-3">
                  <Link
                    to="/vouchers"
                    className="inline-block bg-white text-orange-600 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-amber-50 transition-colors"
                  >
                    Đổi mã ưu đãi
                  </Link>
                </div>
              </div>
              <Star size={100} className="absolute -right-4 -bottom-4 text-white/10" />
            </div>

            {/* Lối Tắt Hữu Ích */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-800 shadow-xs space-y-2">
              <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">
                Lối tắt
              </h4>
              <Link
                to="/orders"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Package size={15} className="text-[#ee4d2d]" /> {t("purchase_orders")}
                </span>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to="/user/vouchers"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Ticket size={15} className="text-amber-500" /> Ví Voucher của tôi
                </span>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to={hasShop ? "/vendor" : "/register-shop"}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Store size={15} className="text-emerald-500" />
                  {hasShop ? "Kênh Người Bán" : "Đăng ký mở shop"}
                </span>
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Facebook Main Feed / Active Tab Content (7 Columns) */}
          <div className="lg:col-span-7">
            {/* Tab: Overview (Chỉnh Sửa Hồ Sơ) */}
            {activeTab === "overview" && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                      Hồ Sơ Của Tôi
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Quản lý thông tin hồ sơ để bảo mật tài khoản
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      {t("full_name")}
                    </label>
                    <Controller
                      control={control}
                      name="full_name"
                      render={({ field }) => (
                        <input
                          {...field}
                          className="input-modern"
                          placeholder="Họ và tên của bạn"
                        />
                      )}
                    />
                    {errors.full_name && (
                      <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="input-modern opacity-70 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                        {t("phone_number")}
                      </label>
                      <Controller
                        control={control}
                        name="phone"
                        render={({ field }) => (
                          <input
                            {...field}
                            className="input-modern"
                            placeholder="Số điện thoại"
                          />
                        )}
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                        {t("birthday")}
                      </label>
                      <Controller
                        control={control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <input
                            type="date"
                            {...field}
                            className="input-modern"
                          />
                        )}
                      />
                      {errors.date_of_birth && (
                        <p className="text-xs text-red-500 mt-1">{errors.date_of_birth.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                        {t("gender")}
                      </label>
                      <Controller
                        control={control}
                        name="gender"
                        render={({ field }) => (
                          <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                              <input
                                type="radio"
                                value="male"
                                checked={field.value === "male"}
                                onChange={() => field.onChange("male")}
                                className="text-[#ee4d2d] focus:ring-[#ee4d2d]"
                              />
                              <span>{t("gender_male")}</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                              <input
                                type="radio"
                                value="female"
                                checked={field.value === "female"}
                                onChange={() => field.onChange("female")}
                                className="text-[#ee4d2d] focus:ring-[#ee4d2d]"
                              />
                              <span>{t("gender_female")}</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                              <input
                                type="radio"
                                value="other"
                                checked={field.value === "other"}
                                onChange={() => field.onChange("other")}
                                className="text-[#ee4d2d] focus:ring-[#ee4d2d]"
                              />
                              <span>{t("gender_other")}</span>
                            </label>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUpdating ? "Đang lưu..." : t("save_changes")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab: Addresses (Sổ Địa Chỉ) */}
            {activeTab === "addresses" && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                      Địa Chỉ Của Tôi
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Địa chỉ nhận hàng mặc định khi đặt hàng
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAddressId(null);
                      resetAddress({ recipient_name: "", phone_number: "", address_line: "" });
                      setIsAddingAddress(true);
                    }}
                    className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Thêm địa chỉ</span>
                  </button>
                </div>

                {/* Address Form Modal/Box */}
                {isAddingAddress && (
                  <form
                    onSubmit={handleAddressSubmit(onSubmitAddress)}
                    className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                      {editingAddressId ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          {...registerAddress("recipient_name")}
                          placeholder="Họ và tên người nhận"
                          className="input-modern"
                        />
                        {addressErrors.recipient_name && (
                          <p className="text-[11px] text-red-500 mt-0.5">
                            {String(addressErrors.recipient_name.message)}
                          </p>
                        )}
                      </div>
                      <div>
                        <input
                          {...registerAddress("phone_number")}
                          placeholder="Số điện thoại"
                          className="input-modern"
                        />
                        {addressErrors.phone_number && (
                          <p className="text-[11px] text-red-500 mt-0.5">
                            {String(addressErrors.phone_number.message)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <input
                        {...registerAddress("address_line")}
                        placeholder="Địa chỉ chi tiết (Số nhà, tên đường, phường/xã, quận/huyện)"
                        className="input-modern"
                      />
                      {addressErrors.address_line && (
                        <p className="text-[11px] text-red-500 mt-0.5">
                          {String(addressErrors.address_line.message)}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingAddress(false);
                          setEditingAddressId(null);
                        }}
                        className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#ee4d2d] text-white text-xs font-medium hover:bg-[#d03e1e]"
                      >
                        {editingAddressId ? "Cập nhật" : "Lưu địa chỉ"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Address List */}
                <div className="space-y-3">
                  {addresses && addresses.length > 0 ? (
                    addresses.map((addr: any) => (
                      <div
                        key={addr.id}
                        className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                              {addr.recipient_name}
                            </span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs text-gray-600 dark:text-slate-400">
                              {addr.phone_number}
                            </span>
                            {addr.is_default && (
                              <span className="bg-[#fef0ed] text-[#ee4d2d] border border-[#ee4d2d]/30 text-[10px] font-bold px-1.5 py-0.5 rounded-xs">
                                {t("default_badge")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-300">
                            {addr.address_line}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleEditAddress(addr)}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Sửa
                          </button>
                          {!addr.is_default && (
                            <>
                              <button
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="text-xs text-red-500 hover:underline font-medium"
                              >
                                Xóa
                              </button>
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-xs text-gray-500 hover:text-[#ee4d2d] font-medium"
                              >
                                Thiết lập mặc định
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-500">
                      Bạn chưa có địa chỉ giao hàng nào.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Favorites (Sản Phẩm Yêu Thích) */}
            {activeTab === "favorites" && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs">
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                  {t("profile_tab_favorites")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {favorites && favorites.length > 0 ? (
                    favorites
                      .filter((f: any) => f.product)
                      .map((f: any) => (
                        <ProductCard
                          key={f.id}
                          id={f.product.slug || String(f.product.id)}
                          name={f.product.name}
                          price={Number(f.product.sale_price || f.product.price)}
                          originalPrice={
                            f.product.sale_price ? Number(f.product.price) : undefined
                          }
                          image={
                            f.product.images?.[0]?.image_url ||
                            f.product.thumbnail ||
                            "/placeholder.jpg"
                          }
                          category={f.product.category?.name || "Yêu thích"}
                          rating={Number(f.product.rating || 5.0)}
                          sales={Number(f.product.sold_count || 50)}
                        />
                      ))
                  ) : (
                    <div className="col-span-full py-10 text-center text-xs text-gray-500">
                      Chưa có sản phẩm yêu thích nào.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Viewed Products (Sản Phẩm Đã Xem) */}
            {activeTab === "viewed" && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs">
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                  Sản Phẩm Đã Xem Gần Đây
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {viewedProducts && viewedProducts.length > 0 ? (
                    viewedProducts
                      .filter((v: any) => v.product)
                      .map((v: any) => (
                        <ProductCard
                          key={v.id}
                          id={v.product.slug || String(v.product.id)}
                          name={v.product.name}
                          price={Number(v.product.sale_price || v.product.price)}
                          originalPrice={
                            v.product.sale_price ? Number(v.product.price) : undefined
                          }
                          image={
                            v.product.images?.[0]?.image_url ||
                            v.product.thumbnail ||
                            "/placeholder.jpg"
                          }
                          category={v.product.category?.name || "Đã xem"}
                          rating={Number(v.product.rating || 5.0)}
                          sales={Number(v.product.sold_count || 30)}
                        />
                      ))
                  ) : (
                    <div className="col-span-full py-10 text-center text-xs text-gray-500">
                      Bạn chưa xem sản phẩm nào gần đây.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Points (Ví Điểm) */}
            {activeTab === "points" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
                      Điểm tích lũy hiện có
                    </span>
                    <h3 className="text-4xl font-black mt-1">
                      {(profile as any)?.loyalty_points?.toLocaleString() || 0} Xu
                    </h3>
                    <p className="text-xs text-white/90 mt-1">
                      Tương đương{" "}
                      <strong>
                        {(
                          ((profile as any)?.loyalty_points || 0) *
                          (systemSettings?.redeemRate || 100)
                        ).toLocaleString()}
                        ₫
                      </strong>{" "}
                      khi khấu trừ vào hóa đơn mua sắm.
                    </p>
                  </div>
                  <Star size={70} className="text-white/20" />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 mb-3">
                    Ưu đãi đổi xu tại MeeMart
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                      <span className="text-xs font-bold text-orange-600">Voucher 20.000₫</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">Đổi bằng 200 Xu</p>
                    </div>
                    <div className="p-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                      <span className="text-xs font-bold text-orange-600">Voucher 50.000₫</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">Đổi bằng 500 Xu</p>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

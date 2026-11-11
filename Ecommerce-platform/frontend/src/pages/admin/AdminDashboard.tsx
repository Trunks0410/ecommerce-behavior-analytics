import {
   ShieldAlert,
   Users,
   Store,
   Settings,
   Search,
   Bell,
   ExternalLink,
   Check,
   X,
   User,
   BarChart3,
   Menu,
   Landmark,
   Activity,
   ClipboardList,
   AlertCircle,
   Wallet,
   Ticket,
   Eye,
   EyeOff,
   Lock,
   Truck,
   ChevronRight,
   Shield,
   LogOut,
   ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '@/app/stores/slices/authSlice';
import { adminService } from '@/services/adminService';
import type { RootState } from '@/app/stores/store';
import useAuth from '@/hooks/useAuth';
import { NotificationDropdown } from '@/shared/components/layout/NotificationDropdown';
import { getAvatarUrl, getCurrentLocale } from '@/shared/utils/format';

import { UserTab } from './components/UserTab';
import { VendorTab } from './components/VendorTab';
import { SettingsTab } from './components/SettingsTab';
import { FinanceTab } from './components/FinanceTab';
import { ReconciliationTab } from './components/ReconciliationTab';
import { WithdrawalLogTab } from './components/WithdrawalLogTab';
import { SystemLogTab } from './components/SystemLogTab';
import { DisputeTab } from '../manager/components/DisputeTab';
import { ShopWalletTab } from './components/ShopWalletTab';
import { MarketingTab } from '../manager/components/MarketingTab';
import { ShippingPartnersTab } from './components/ShippingPartnersTab';

// ============================================================
// ADMIN DASHBOARD (Chuẩn mực Operate Mode theo AGENTS.md)
// ============================================================

export const AdminDashboard = () => {
   const [searchParams, setSearchParams] = useSearchParams();
   const initialTab = searchParams.get('tab') || 'users';
   const [activeTab, setActiveTab] = useState(initialTab);
   const [showUserDropdown, setShowUserDropdown] = useState(false);
   const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   const [isEditingAdmin, setIsEditingAdmin] = useState(false);
   const [showAdminPassword, setShowAdminPassword] = useState(false);
   const [adminAvatarFile, setAdminAvatarFile] = useState<File | null>(null);
   const dropdownRef = useRef<HTMLDivElement>(null);

   const [adminForm, setAdminForm] = useState({
      full_name: '',
      email: '',
      phone: '',
      gender: 'MALE',
      birthday: '',
      password: '',
      avatar_url: ''
   });

   const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
   const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      message: string;
      onConfirm: () => void;
   } | null>(null);

   const showConfirm = (message: string, onConfirm: () => void) => {
      setConfirmDialog({
         isOpen: true,
         message,
         onConfirm: () => {
            onConfirm();
            setConfirmDialog(null);
         }
      });
   };

   const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type });
   };

   // Tự động tắt toast sau 4 giây
   useEffect(() => {
      if (toast) {
         const timer = setTimeout(() => {
            setToast(null);
         }, 4000);
         return () => clearTimeout(timer);
      }
   }, [toast]);

   // Đóng dropdown khi click ra ngoài
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowUserDropdown(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   const currentUser = useSelector((state: RootState) => state.auth.user);
   const accessToken = useSelector((state: RootState) => state.auth.accessToken);
   const dispatch = useDispatch();
   const { handleLogout } = useAuth();

   // Đồng bộ query tab lên URL
   const handleSelectTab = (tabId: string) => {
      setActiveTab(tabId);
      setSearchParams({ tab: tabId });
      setIsSidebarOpen(false);
   };

   useEffect(() => {
      if (showAdminProfileModal && currentUser) {
         setAdminForm({
            full_name: currentUser.fullName || currentUser.profile?.full_name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            gender: currentUser.gender || currentUser.profile?.gender || 'MALE',
            birthday: currentUser.dateOfBirth || currentUser.profile?.birthday || '',
            password: '',
            avatar_url: currentUser.avatarUrl || currentUser.profile?.avatar_url || '',
         });
         setIsEditingAdmin(false);
         setAdminAvatarFile(null);
      }
   }, [showAdminProfileModal, currentUser]);

   const handleUpdateAdminProfile = async () => {
      if (!currentUser) return;

      try {
         const formData = new FormData();
         formData.append("full_name", adminForm.full_name);
         formData.append("email", adminForm.email);
         formData.append("phone", adminForm.phone);
         formData.append("gender", adminForm.gender);
         if (adminForm.birthday) {
            formData.append("birthday", adminForm.birthday);
         }
         if (adminForm.password) {
            formData.append("password", adminForm.password);
         }
         if (adminAvatarFile) {
            formData.append("avatar", adminAvatarFile);
         } else {
            formData.append("avatar_url", adminForm.avatar_url);
         }

         const res = await adminService.updateUser(currentUser.id, formData);
         const updatedUser = res.data;
         const newUserData = {
            ...currentUser,
            email: updatedUser.email,
            phone: updatedUser.phone,
            fullName: updatedUser.profile?.full_name,
            avatarUrl: updatedUser.profile?.avatar_url,
            gender: updatedUser.profile?.gender,
            dateOfBirth: updatedUser.profile?.birthday,
         };
         dispatch(setUser(newUserData));
         showToast("Cập nhật thông tin cá nhân Admin thành công!", "success");
         setIsEditingAdmin(false);
         setAdminAvatarFile(null);
      } catch (e: any) {
         showToast(e.response?.data?.message || "Lỗi cập nhật thông tin cá nhân", "error");
      }
   };

   // Danh sách các mục quản trị hệ thống
   const sidebarItems = [
      { id: "users", label: "Quản lý Tài khoản", icon: <Users size={18} /> },
      { id: "vendors", label: "Duyệt gian hàng", icon: <Store size={18} /> },
      { id: "shipping_partners", label: "Đối tác Vận chuyển (UTE Express)", icon: <Truck size={18} /> },
      { id: "disputes", label: "Giải quyết khiếu nại", icon: <AlertCircle size={18} /> },
      { id: "shop_wallets", label: "Quản lý ví Shop", icon: <Wallet size={18} /> },
      { id: "finance", label: "Báo cáo tài chính", icon: <BarChart3 size={18} /> },
      { id: "reconciliation", label: "Đối soát thanh toán", icon: <Landmark size={18} /> },
      { id: "withdrawal_logs", label: "Lịch sử rút tiền", icon: <Activity size={18} /> },
      { id: "marketing", label: "Chiến dịch Marketing", icon: <Ticket size={18} /> },
      { id: "settings", label: "Cấu hình hệ thống", icon: <Settings size={18} /> },
      { id: "system_logs", label: "Nhật ký hệ thống", icon: <ClipboardList size={18} /> },
   ];

   // Lấy tiêu đề hiển thị của tab hiện hành
   const getActiveTabTitle = () => {
      const item = sidebarItems.find(i => i.id === activeTab);
      return item ? item.label : "Quản trị sàn";
   };

   return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex antialiased font-sans">

         {/* Backdrop trên màn hình di động */}
         {isSidebarOpen && (
            <div 
               className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
               onClick={() => setIsSidebarOpen(false)}
            />
         )}

         {/* =====================================================================
             SIDEBAR BÊN TRÁI (LEFT SIDEBAR - 260px)
            ===================================================================== */}
         <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50 shrink-0 select-none transition-transform duration-200
            lg:translate-x-0 lg:flex
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
         `}>
            {/* Header thương hiệu */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
               <Link to="/" className="flex items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-blue-600 transition-colors">
                     M
                  </div>
                  <div>
                     <h2 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                        MeeMart Admin
                     </h2>
                     <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                        Cổng quản trị sàn TMĐT
                     </span>
                  </div>
               </Link>

               {/* Nút đóng menu trên mobile */}
               <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Đóng menu"
               >
                  <X size={18} />
               </button>
            </div>

            {/* Menu danh mục chính (Operate Mode - Touch Targets >= 44px) */}
            <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
               {sidebarItems.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                     <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                           isActive
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                     >
                        <span className={isActive ? 'text-white' : 'text-slate-400'}>
                           {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                     </button>
                  );
               })}
            </nav>
         </aside>

         {/* =====================================================================
             NỘI DUNG CHÍNH BÊN PHẢI (MAIN CANVAS)
            ===================================================================== */}
         <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

            {/* TOPBAR TRÊN CÙNG: BREADCRUMB + TÌM KIẾM + PHÂN HỆ + ADMIN DROPDOWN */}
            <header className="sticky top-0 z-30 h-16 px-6 md:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shadow-xs">
               
               {/* Khu vực trái: Mobile menu toggle + Breadcrumb & Title */}
               <div className="flex items-center gap-3 min-w-0">
                  <button
                     onClick={() => setIsSidebarOpen(true)}
                     className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                     title="Mở menu điều hướng"
                  >
                     <Menu size={18} />
                  </button>

                  <div>
                     <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>Quản trị sàn</span>
                        <ChevronRight size={12} />
                        <span className="font-semibold text-slate-700">{getActiveTabTitle()}</span>
                     </div>
                     <h1 className="text-sm font-bold tracking-tight text-slate-900 truncate">
                        {getActiveTabTitle()}
                     </h1>
                  </div>
               </div>

               {/* Khu vực phải: Thông báo, Xem website, Tài khoản Admin */}
               <div className="flex items-center gap-3">

                  {/* Nút xem Website khách hàng */}
                  <Link 
                     to="/" 
                     target="_blank"
                     className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
                  >
                     <Store size={14} className="text-slate-400" />
                     <span>Xem website sàn</span>
                     <ExternalLink size={12} className="text-slate-400" />
                  </Link>

                  {/* Nút thông báo */}
                  <NotificationDropdown />

                  <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

                  {/* ADMIN PROFILE DROPDOWN */}
                  <div className="relative" ref={dropdownRef}>
                     <button
                        type="button"
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer ${
                           showUserDropdown
                              ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50 shadow-2xs'
                        }`}
                        title="Tài khoản Quản trị viên"
                     >
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                           {currentUser?.avatarUrl || currentUser?.profile?.avatar_url ? (
                              <img src={getAvatarUrl(currentUser?.avatarUrl || currentUser?.profile?.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                           ) : (
                              currentUser?.fullName?.[0]?.toUpperCase() || currentUser?.profile?.full_name?.[0]?.toUpperCase() || "AD"
                           )}
                        </div>
                        <div className="hidden md:block text-left leading-tight">
                           <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                              {currentUser?.email || "admin@meemart.com"}
                           </div>
                           <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Quản trị viên
                           </div>
                        </div>
                        <ChevronDown
                           size={14}
                           className={`text-slate-400 transition-transform duration-200 ${
                              showUserDropdown ? 'rotate-180 text-slate-900' : ''
                           }`}
                        />
                     </button>

                     {/* DROPDOWN MENU KHI CLICK */}
                     {showUserDropdown && (
                        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                           <div className="px-4 py-2.5 border-b border-slate-100">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                 Tài khoản Quản trị
                              </div>
                              <div className="text-xs font-bold truncate mt-0.5 text-slate-900">
                                 {currentUser?.email || "admin@meemart.com"}
                              </div>
                              <div className="text-[11px] text-emerald-600 font-medium">
                                 Quyền: System Administrator
                              </div>
                           </div>

                           <div className="p-1.5 space-y-0.5">
                              <button
                                 onClick={() => {
                                    setShowAdminProfileModal(true);
                                    setShowUserDropdown(false);
                                 }}
                                 className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
                              >
                                 <User size={15} className="text-slate-400" />
                                 <span>Thông tin cá nhân Admin</span>
                              </button>

                              <a
                                 href={`http://localhost:5175${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`}
                                 target="_blank"
                                 rel="noreferrer"
                                 onClick={() => setShowUserDropdown(false)}
                                 className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                 <div className="flex items-center gap-2.5">
                                    <BarChart3 size={15} className="text-slate-400" />
                                    <span>Phân tích hành vi khách hàng</span>
                                 </div>
                                 <ExternalLink size={12} className="text-slate-400" />
                              </a>
                           </div>

                           <div className="border-t border-slate-100 my-1" />

                           <div className="p-1.5">
                              <button
                                 type="button"
                                 onClick={handleLogout}
                                 className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                 <LogOut size={15} />
                                 <span>Đăng xuất tài khoản</span>
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </header>

            {/* KHÔNG GIAN NỘI DUNG TỪNG PHÂN HỆ */}
            <div className="p-6 md:p-8 max-w-7xl w-full mx-auto flex-1 space-y-6">

               {activeTab === "users" && <UserTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "vendors" && <VendorTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "settings" && <SettingsTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "shipping_partners" && <ShippingPartnersTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "finance" && <FinanceTab />}
               {activeTab === "reconciliation" && <ReconciliationTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "withdrawal_logs" && <WithdrawalLogTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "system_logs" && <SystemLogTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "disputes" && <DisputeTab addNotification={(msg) => showToast(msg, "success")} />}
               {activeTab === "marketing" && <MarketingTab addNotification={(msg) => showToast(msg, "success")} />}
               {activeTab === "shop_wallets" && <ShopWalletTab showToast={showToast} showConfirm={showConfirm} />}

            </div>
         </main>

         {/* =====================================================================
             MODAL PROFILE ADMIN (Sạch sẽ, Tinh tế theo chuẩn Production)
            ===================================================================== */}
         {showAdminProfileModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setShowAdminProfileModal(false)}>
               <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-6 text-slate-900" onClick={e => e.stopPropagation()}>
                  <button 
                     onClick={() => setShowAdminProfileModal(false)} 
                     className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                     <X size={18} />
                  </button>

                  <div className="space-y-1">
                     <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        Thông tin cá nhân Admin
                     </h2>
                     <p className="text-xs text-slate-500">
                        Xem và cập nhật thông tin định danh quản trị viên hệ thống
                     </p>
                  </div>

                  {!isEditingAdmin ? (
                     <div className="space-y-5">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                           <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl overflow-hidden shrink-0">
                              {currentUser?.avatarUrl || currentUser?.profile?.avatar_url ? (
                                 <img src={getAvatarUrl(currentUser?.avatarUrl || currentUser?.profile?.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                 currentUser?.fullName?.[0]?.toUpperCase() || currentUser?.profile?.full_name?.[0]?.toUpperCase() || "A"
                              )}
                           </div>
                           <div className="space-y-1">
                              <h3 className="text-base font-bold text-slate-900">
                                 {currentUser?.fullName || currentUser?.profile?.full_name || "Super Admin"}
                              </h3>
                              <p className="text-xs text-slate-500">{currentUser?.email || "admin@meemart.com"}</p>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold">
                                 {typeof currentUser?.role === 'object' && currentUser?.role !== null
                                    ? currentUser.role?.role_name || "Admin"
                                    : currentUser?.role || "Admin"}
                              </span>
                           </div>
                        </div>

                        <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                           <div className="flex justify-between py-2">
                              <span className="text-slate-500">Số điện thoại:</span>
                              <span className="font-semibold text-slate-900">{currentUser?.phone || currentUser?.profile?.phone || "Chưa cập nhật"}</span>
                           </div>
                           <div className="flex justify-between py-2">
                              <span className="text-slate-500">Ngày sinh:</span>
                              <span className="font-semibold text-slate-900">
                                 {currentUser?.dateOfBirth || currentUser?.profile?.birthday
                                    ? new Date(currentUser?.dateOfBirth || currentUser?.profile?.birthday).toLocaleDateString(getCurrentLocale())
                                    : "Chưa cập nhật"}
                              </span>
                           </div>
                           <div className="flex justify-between py-2">
                              <span className="text-slate-500">Giới tính:</span>
                              <span className="font-semibold text-slate-900">{currentUser?.gender || currentUser?.profile?.gender || "Chưa cập nhật"}</span>
                           </div>
                           <div className="flex justify-between py-2">
                              <span className="text-slate-500">Địa chỉ:</span>
                              <span className="font-semibold text-slate-900 truncate max-w-[220px]" title={currentUser?.address || currentUser?.profile?.address}>
                                 {currentUser?.address || currentUser?.profile?.address || "Chưa cập nhật"}
                              </span>
                           </div>
                        </div>

                        <button
                           onClick={() => setIsEditingAdmin(true)}
                           className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                        >
                           Chỉnh sửa hồ sơ
                        </button>
                     </div>
                  ) : (
                     <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
                        <div>
                           <label className="text-xs font-semibold text-slate-700 block mb-1.5">Họ và tên</label>
                           <input
                              type="text" value={adminForm.full_name}
                              onChange={e => setAdminForm({ ...adminForm, full_name: e.target.value })}
                              className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                           />
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email</label>
                           <input
                              type="email" value={adminForm.email}
                              onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                              className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                           />
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-700 block mb-1.5">Số điện thoại</label>
                           <input
                              type="text" value={adminForm.phone}
                              onChange={e => setAdminForm({ ...adminForm, phone: e.target.value })}
                              className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                           />
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-700 block mb-1.5">Giới tính</label>
                           <select
                              value={adminForm.gender}
                              onChange={e => setAdminForm({ ...adminForm, gender: e.target.value })}
                              className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                           >
                              <option value="MALE">Nam</option>
                              <option value="FEMALE">Nữ</option>
                              <option value="OTHER">Khác</option>
                           </select>
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-700 block mb-1.5">Mật khẩu mới (Để trống nếu giữ nguyên)</label>
                           <div className="relative">
                              <input
                                 type={showAdminPassword ? "text" : "password"} value={adminForm.password}
                                 onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                                 placeholder="••••••••••••"
                                 className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 pr-10 py-2 font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                              />
                              <button
                                 type="button"
                                 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                 onClick={() => setShowAdminPassword(!showAdminPassword)}
                              >
                                 {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                           </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                           <button
                              onClick={() => setIsEditingAdmin(false)}
                              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                           >
                              Hủy
                           </button>
                           <button
                              onClick={handleUpdateAdminProfile}
                              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                           >
                              Lưu thay đổi
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* =====================================================================
             MODERN TOAST NOTIFICATION (Không viền brutalist, không neon)
            ===================================================================== */}
         {toast && (
            <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-3 duration-200">
               <div className={`p-4 rounded-2xl border shadow-xl flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
                  toast.type === 'success'
                     ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                     : toast.type === 'error'
                     ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/10'
                     : 'bg-blue-50/95 border-blue-200 text-blue-900 shadow-blue-500/10'
               }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                     toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                     {toast.type === 'success' && <Check size={14} />}
                     {toast.type === 'error' && <X size={14} />}
                     {toast.type === 'info' && <Bell size={14} />}
                  </div>
                  <span className="font-medium text-slate-800">{toast.message}</span>
                  <button 
                     onClick={() => setToast(null)} 
                     className="ml-2 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                     aria-label="Đóng thông báo"
                  >
                     <X size={14} />
                  </button>
               </div>
            </div>
         )}

         {/* =====================================================================
             MODERN CONFIRM DIALOG
            ===================================================================== */}
         {confirmDialog && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setConfirmDialog(null)}>
               <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                     <AlertCircle size={22} />
                  </div>
                  <div>
                     <h3 className="text-base font-bold text-slate-900">Xác nhận thao tác</h3>
                     <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{confirmDialog.message}</p>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                     <button
                        onClick={() => setConfirmDialog(null)}
                        className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                     >
                        Hủy
                     </button>
                     <button
                        onClick={confirmDialog.onConfirm}
                        className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                     >
                        Xác nhận
                     </button>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

export default AdminDashboard;

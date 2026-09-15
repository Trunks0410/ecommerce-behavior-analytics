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
   TrendingUp,
   User,
   BarChart3,
   Menu,
   Landmark,
   Activity,
   ClipboardList,
   AlertCircle,
   Wallet,
   Ticket,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '@/app/stores/slices/authSlice';
import { adminService } from '@/services/adminService';
import type { RootState } from '@/app/stores/store';
import useAuth from '@/hooks/useAuth';
import { NotificationDropdown } from '@/shared/components/layout/NotificationDropdown';
import { getAvatarUrl } from '@/shared/utils/format';

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

// ============================================================
// ADMIN DASHBOARD
// ============================================================

const AdminDashboard = () => {
   const [activeTab, setActiveTab] = useState("users");
   const [showUserDropdown, setShowUserDropdown] = useState(false);
   const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
   const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
   const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   const [isEditingAdmin, setIsEditingAdmin] = useState(false);
   const [adminAvatarFile, setAdminAvatarFile] = useState<File | null>(null);
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

   useEffect(() => {
      if (toast) {
         const timer = setTimeout(() => {
            setToast(null);
         }, 4000);
         return () => clearTimeout(timer);
      }
   }, [toast]);

   const currentUser = useSelector((state: RootState) => state.auth.user);
   const dispatch = useDispatch();
   const { handleLogout } = useAuth();

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

   const sidebarItems = [
      { id: "users", label: "Quản lý Tài khoản", icon: <Users size={20} /> },
      { id: "vendors", label: "Duyệt gian hàng", icon: <Store size={20} /> },
      { id: "disputes", label: "Giải quyết khiếu nại", icon: <AlertCircle size={20} /> },
      { id: "marketing", label: "Chiến dịch Marketing", icon: <Ticket size={20} /> },
      { id: "shop_wallets", label: "Quản lý ví Shop", icon: <Wallet size={20} /> },
      { id: "settings", label: "Cấu hình hệ thống", icon: <Settings size={20} /> },
      { id: "finance", label: "Báo cáo tài chính", icon: <BarChart3 size={20} /> },
      { id: "reconciliation", label: "Đối soát thanh toán", icon: <Landmark size={20} /> },
      { id: "withdrawal_logs", label: "Lịch sử rút tiền", icon: <Activity size={20} /> },
      { id: "system_logs", label: "Nhật ký hệ thống", icon: <ClipboardList size={20} /> },
   ];

   return (
      <div className="min-h-screen bg-[#F4F4F0] flex overflow-hidden">

         {/* Mobile Sidebar Backdrop */}
         {isSidebarOpen && (
            <div 
               className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
               onClick={() => setIsSidebarOpen(false)}
            />
         )}

         {/* Sidebar */}
         <aside className={`w-64 bg-white border-r-2 border-black flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50 shrink-0 transition-transform duration-300
            lg:translate-x-0 lg:flex
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
         `}>
            <div className="p-8 border-b-2 border-black/5 flex items-center justify-between">
               <Link to="/" className="flex items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
                  <div className="w-10 h-10 bg-red-600 text-white border-2 border-black rounded-xl flex items-center justify-center group-hover:bg-black transition-all shadow-subtle group-hover:shadow-none">
                     <ShieldAlert size={24} />
                  </div>
                  <div className="flex flex-col">
                     <span className="font-serif text-lg font-black tracking-tighter uppercase leading-none text-red-600">UTEShop</span>
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-black">ADMIN</span>
                  </div>
               </Link>
               {/* Mobile Close Button */}
               <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded-full transition-colors text-black"
               >
                  <X size={20} />
               </button>
            </div>

            <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
               {sidebarItems.map(item => (
                  <button
                     key={item.id}
                     onClick={() => {
                        setActiveTab(item.id);
                        setIsSidebarOpen(false);
                      }}
                     className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-black text-white shadow-brutal translate-x-1' : 'hover:bg-red-50 text-gray-400 hover:text-black'}`}
                  >
                     {item.icon}
                     {item.label}
                  </button>
               ))}
            </nav>
         </aside>

         {/* Main Content */}
         <main className="flex-grow flex flex-col h-screen overflow-y-auto">

            {/* Topbar */}
            <header className="bg-white/80 backdrop-blur-md border-b border-black/5 h-20 px-4 md:px-10 flex items-center justify-between sticky top-0 z-40 shadow-sm">
               <div className="flex items-center gap-2 flex-grow max-w-xs md:max-w-md lg:max-w-lg">
                  {/* Mobile Toggle Button */}
                  <button
                     onClick={() => setIsSidebarOpen(true)}
                     className="lg:hidden p-2.5 border-2 border-black rounded-xl bg-white hover:bg-gray-50 active:translate-y-[2px] transition-all shadow-subtle shrink-0 text-black"
                     title="Mở menu"
                  >
                     <Menu size={18} />
                  </button>
                  <div className="relative w-full my-4 hidden sm:block">
                     <input
                        type="text"
                        placeholder="Tìm kiếm mọi thứ trên hệ thống..."
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-12 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all shadow-inner"
                     />
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
               </div>

               <div className="flex items-center gap-6">
                  <NotificationDropdown />

                  <div className="w-[2px] h-8 bg-gray-100"></div>

                  <div className="relative">
                     <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="w-11 h-11 bg-red-100 border-2 border-black rounded-xl flex items-center justify-center text-red-600 hover:bg-red-200 transition-all active:translate-y-1 overflow-hidden"
                     >
                        {currentUser?.avatarUrl || currentUser?.profile?.avatar_url ? (
                           <img src={getAvatarUrl(currentUser.avatarUrl || currentUser.profile.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                           <User size={24} />
                        )}
                     </button>

                     {showUserDropdown && (
                        <div className="absolute right-0 mt-4 w-64 bg-white border-2 border-black rounded-2xl shadow-brutal z-50 p-4 animate-in fade-in slide-in-from-top-2">
                           <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black overflow-hidden shrink-0">
                                 {currentUser?.avatarUrl || currentUser?.profile?.avatar_url ? (
                                    <img src={getAvatarUrl(currentUser.avatarUrl || currentUser.profile.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                                 ) : (
                                    currentUser?.fullName?.[0]?.toUpperCase() || currentUser?.profile?.full_name?.[0]?.toUpperCase() || "AD"
                                 )}
                              </div>
                              <div>
                                 <p className="text-xs font-black uppercase text-black line-clamp-1">{currentUser?.fullName || currentUser?.profile?.full_name || "Admin"}</p>
                                 <p className="text-[10px] text-red-500 font-bold line-clamp-1">{currentUser?.email || "admin@uteshop.vn"}</p>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <button
                                 onClick={() => {
                                    setShowAdminProfileModal(true);
                                    setShowUserDropdown(false);
                                 }}
                                 className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-black transition-all"
                              >
                                 Thông tin cá nhân
                              </button>
                              <button onClick={handleLogout} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all mt-2">Đăng xuất</button>
                           </div>
                        </div>
                     )}
                  </div>

                  <Link to="/" className="flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-black text-white hover:bg-primary transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                     Website <ExternalLink size={14} />
                  </Link>
               </div>
            </header>

            {/* Content Area */}
            <div className="p-4 md:p-10 max-w-7xl w-full mx-auto">

               {activeTab === "users" && <UserTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "vendors" && <VendorTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "settings" && <SettingsTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "finance" && <FinanceTab />}
               {activeTab === "reconciliation" && <ReconciliationTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "withdrawal_logs" && <WithdrawalLogTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "system_logs" && <SystemLogTab showToast={showToast} showConfirm={showConfirm} />}
               {activeTab === "disputes" && <DisputeTab addNotification={(msg) => showToast(msg, "success")} />}
               {activeTab === "marketing" && <MarketingTab addNotification={(msg) => showToast(msg, "success")} />}
               {activeTab === "shop_wallets" && <ShopWalletTab showToast={showToast} showConfirm={showConfirm} />}

            </div>
         </main>

         {/* Modal Profile Admin */}
         {showAdminProfileModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAdminProfileModal(false)}>
               <div className="bg-white border-[3px] border-black rounded-[2.5rem] p-10 max-w-lg w-full shadow-brutal relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowAdminProfileModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                     <X size={20} />
                  </button>
                  <h2 className="text-2xl font-serif font-black tracking-tighter uppercase mb-6 border-b-2 border-black pb-4 text-center">Thông tin cá nhân Admin</h2>

                  {!isEditingAdmin ? (
                     <>
                        <div className="flex flex-col items-center mb-6">
                           <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center font-black text-red-600 text-3xl border-4 border-black overflow-hidden shadow-subtle mb-4">
                              {currentUser?.avatarUrl || currentUser?.profile?.avatar_url ? (
                                 <img src={getAvatarUrl(currentUser?.avatarUrl || currentUser?.profile?.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                 currentUser?.fullName?.[0]?.toUpperCase() || currentUser?.profile?.full_name?.[0]?.toUpperCase() || "A"
                              )}
                           </div>
                           <h3 className="text-xl font-black uppercase text-center text-black">{currentUser?.fullName || currentUser?.profile?.full_name || "Admin"}</h3>
                           <p className="text-xs font-bold text-gray-500 mt-1">{currentUser?.email || "admin@uteshop.vn"}</p>
                           <span className="mt-3 px-3 py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full border border-black">
                              {typeof currentUser?.role === 'object' && currentUser?.role !== null
                                 ? currentUser.role.role_name
                                 : currentUser?.role || "Admin"}
                           </span>
                        </div>

                        <div className="space-y-4 text-black">
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Số điện thoại</span>
                              <span className="text-sm font-bold">{currentUser?.phone || currentUser?.profile?.phone || "Chưa cập nhật"}</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Ngày sinh</span>
                              <span className="text-sm font-bold">
                                 {currentUser?.dateOfBirth || currentUser?.profile?.birthday
                                    ? new Date(currentUser?.dateOfBirth || currentUser?.profile?.birthday).toLocaleDateString("vi-VN")
                                    : "Chưa cập nhật"}
                              </span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Giới tính</span>
                              <span className="text-sm font-bold">{currentUser?.gender || currentUser?.profile?.gender || "Chưa cập nhật"}</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Địa chỉ</span>
                              <span className="text-sm font-bold truncate max-w-[200px]" title={currentUser?.address || currentUser?.profile?.address}>
                                 {currentUser?.address || currentUser?.profile?.address || "Chưa cập nhật"}
                              </span>
                           </div>

                           <button
                              onClick={() => setIsEditingAdmin(true)}
                              className="mt-6 w-full py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-y-[2px]"
                           >
                              Chỉnh sửa hồ sơ
                           </button>
                        </div>
                     </>
                  ) : (
                     <div className="space-y-4 text-black text-left mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="flex flex-col items-center mb-6">
                           <div
                              onClick={() => document.getElementById('admin-avatar-input')?.click()}
                              className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center font-black text-red-600 text-3xl border-4 border-black overflow-hidden shadow-subtle mb-2 cursor-pointer relative group"
                              title="Click để thay đổi ảnh đại diện"
                           >
                              {adminAvatarFile ? (
                                 <img src={URL.createObjectURL(adminAvatarFile)} alt="avatar preview" className="w-full h-full object-cover" />
                              ) : adminForm.avatar_url ? (
                                 <img src={getAvatarUrl(adminForm.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                 adminForm.full_name?.[0]?.toUpperCase() || "A"
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <span className="text-white text-[10px] font-bold uppercase text-center leading-tight">Thay đổi<br />ảnh</span>
                              </div>
                           </div>
                           <input
                              id="admin-avatar-input"
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                 if (e.target.files && e.target.files[0]) {
                                    setAdminAvatarFile(e.target.files[0]);
                                 }
                              }}
                              className="hidden"
                           />
                           <p className="text-[9px] font-black uppercase text-gray-400">Click vào ảnh để thay đổi</p>
                        </div>

                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Họ và tên</label>
                           <input
                              type="text" value={adminForm.full_name}
                              onChange={e => setAdminForm({ ...adminForm, full_name: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Email</label>
                           <input
                              type="email" value={adminForm.email}
                              onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Số điện thoại</label>
                           <input
                              type="text" value={adminForm.phone}
                              onChange={e => setAdminForm({ ...adminForm, phone: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Giới tính</label>
                           <select
                              value={adminForm.gender}
                              onChange={e => setAdminForm({ ...adminForm, gender: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           >
                              <option value="MALE">Nam</option>
                              <option value="FEMALE">Nữ</option>
                              <option value="OTHER">Khác</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Ngày sinh</label>
                           <input
                              type="date" value={adminForm.birthday ? adminForm.birthday.slice(0, 10) : ''}
                              onChange={e => setAdminForm({ ...adminForm, birthday: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Mật khẩu mới (Để trống nếu không đổi)</label>
                           <input
                              type="password" value={adminForm.password}
                              onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                              placeholder="••••••••"
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div className="flex gap-4 mt-6">
                           <button
                              onClick={handleUpdateAdminProfile}
                              className="flex-grow py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-y-[2px]"
                           >
                              Lưu thay đổi
                           </button>
                           <button
                              onClick={() => setIsEditingAdmin(false)}
                              className="px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-white hover:bg-gray-50 transition-all text-black"
                           >
                              Hủy
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}
         {toast && (
            <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
               <div className={`border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 font-black text-sm ${toast.type === 'success' ? 'bg-[#A3E635]' : toast.type === 'error' ? 'bg-[#F87171]' : 'bg-[#60A5FA]'
                  }`}>
                  {toast.type === 'success' && <Check className="w-5 h-5 stroke-[3]" />}
                  {toast.type === 'error' && <X className="w-5 h-5 stroke-[3]" />}
                  {toast.type === 'info' && <Bell className="w-5 h-5 stroke-[3]" />}
                  <span className="text-black uppercase tracking-wider">{toast.message}</span>
                  <button onClick={() => setToast(null)} className="ml-2 hover:bg-black/10 p-1 rounded transition-colors cursor-pointer">
                     <X className="w-4 h-4" />
                  </button>
               </div>
            </div>
         )}
         {confirmDialog && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmDialog(null)}>
               <div className="bg-white border-[3px] border-black rounded-[2rem] p-8 max-w-sm w-full shadow-brutal text-center" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-4 text-black">Xác nhận</h3>
                  <p className="text-sm font-bold text-gray-700 mb-6">{confirmDialog.message}</p>
                  <div className="flex gap-4 justify-center">
                     <button
                        onClick={confirmDialog.onConfirm}
                        className="px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-y-[2px]"
                     >
                        Đồng ý
                     </button>
                     <button
                        onClick={() => setConfirmDialog(null)}
                        className="px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-white hover:bg-gray-50 transition-all text-black"
                     >
                        Hủy
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default AdminDashboard;

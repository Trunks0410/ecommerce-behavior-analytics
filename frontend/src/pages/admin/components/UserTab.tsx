import { useState, useEffect, useCallback } from 'react';
import {
   Users,
   UserPlus,
   Loader2,
   Check,
   Eye,
   Lock,
   LockOpen,
   X,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { getAvatarUrl } from '@/shared/utils/format';

interface UserTabProps {
   showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
   showConfirm: (message: string, onConfirm: () => void) => void;
}

export const UserTab = ({ showToast, showConfirm }: UserTabProps) => {
   const [roleTab, setRoleTab] = useState("manager");
   const [users, setUsers] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [showForm, setShowForm] = useState(false);
   const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', gender: 'MALE' });
   const [submitting, setSubmitting] = useState(false);
   const [shops, setShops] = useState<any[]>([]);

   useEffect(() => {
      const fetchShops = async () => {
         try {
            const res = await adminService.getShops("APPROVED");
            setShops(res.data || []);
         } catch (e) {
            console.error("Error fetching shops:", e);
         }
      };
      fetchShops();
   }, []);

   // Chi tiết người dùng cho Modal
   const [selectedUser, setSelectedUser] = useState<any>(null);
   const [isEditingUser, setIsEditingUser] = useState(false);
   const [userAvatarFile, setUserAvatarFile] = useState<File | null>(null);
   const [userForm, setUserForm] = useState({
      full_name: '',
      email: '',
      phone: '',
      gender: 'MALE',
      birthday: '',
      password: '',
      avatar_url: ''
   });

   const fetchUsers = useCallback(async () => {
      setLoading(true);
      try {
         const res = await adminService.getUsersByRole(roleTab);
         setUsers(res.data || []);
      } catch (e: any) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   }, [roleTab]);

   useEffect(() => {
      if (selectedUser) {
         setUserForm({
            full_name: selectedUser.profile?.full_name || '',
            email: selectedUser.email || '',
            phone: selectedUser.phone || '',
            gender: selectedUser.profile?.gender || 'MALE',
            birthday: selectedUser.profile?.birthday || '',
            password: '',
            avatar_url: selectedUser.profile?.avatar_url || '',
         });
         setIsEditingUser(false);
         setUserAvatarFile(null);
      } else {
         setIsEditingUser(false);
         setUserAvatarFile(null);
      }
   }, [selectedUser]);

   const handleUpdateUserProfile = async () => {
      try {
         const formData = new FormData();
         formData.append("full_name", userForm.full_name);
         formData.append("email", userForm.email);
         formData.append("phone", userForm.phone);
         formData.append("gender", userForm.gender);
         if (userForm.birthday) {
            formData.append("birthday", userForm.birthday);
         }
         if (userForm.password) {
            formData.append("password", userForm.password);
         }
         if (userAvatarFile) {
            formData.append("avatar", userAvatarFile);
         } else {
            formData.append("avatar_url", userForm.avatar_url);
         }

         const res = await adminService.updateUser(selectedUser.id, formData);
         fetchUsers();
         setSelectedUser(res.data);
         showToast("Cập nhật thông tin tài khoản thành công!", "success");
         setIsEditingUser(false);
         setUserAvatarFile(null);
      } catch (e: any) {
         showToast(e.response?.data?.message || "Lỗi cập nhật thông tin tài khoản", "error");
      }
   };

   const roles = [
      { id: "manager", label: "Manager" },
      { id: "user", label: "Customer" },
      { id: "vendor", label: "Vendor" },
      { id: "shipper", label: "Shipper" },
   ];
   useEffect(() => { fetchUsers(); }, [fetchUsers]);

   const handleCreateUser = async () => {
      if (!form.email) return showToast("Email là bắt buộc", "error");
      if (roleTab !== 'shipper' && !form.password) return showToast("Mật khẩu là bắt buộc", "error");
      if (roleTab === 'shipper') {
         if (!form.phone) return showToast("Số điện thoại là bắt buộc", "error");
      }
      setSubmitting(true);
      try {
         await adminService.createUser({ ...form, role: roleTab });
         setForm({ email: '', password: '', full_name: '', phone: '', gender: 'MALE' });
         setShowForm(false);
         showToast("Tạo tài khoản thành công!", "success");
         fetchUsers();
      } catch (e: any) {
         showToast(e.response?.data?.message || `Lỗi tạo tài khoản`, "error");
      } finally {
         setSubmitting(false);
      }
   };

   const handleLock = (id: number) => {
      showConfirm("Xác nhận khóa tài khoản này?", async () => {
         try {
            await adminService.lockUser(id);
            showToast("Khóa tài khoản thành công!", "success");
            fetchUsers();
         } catch (e: any) {
            showToast(e.response?.data?.message || "Lỗi khóa tài khoản", "error");
         }
      });
   };

   const handleUnlock = async (id: number) => {
      try {
         await adminService.unlockUser(id);
         showToast("Mở khóa tài khoản thành công!", "success");
         fetchUsers();
      } catch (e: any) {
         showToast(e.response?.data?.message || "Lỗi mở khóa", "error");
      }
   };

   const getRoleLabel = (role: string) => {
      if (role === "user") return "Customer";
      if (role === "manager") return "Manager";
      if (role === "vendor") return "Vendor";
      if (role === "shipper") return "Shipper";
      return role;
   };

   return (
      <div className="space-y-8 relative">
         <div className="flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-serif font-black tracking-tighter uppercase text-black">Quản lý Tài khoản</h1>
               <div className="flex gap-2 mt-4">
                  {roles.map(r => (
                     <button
                        key={r.id}
                        onClick={() => setRoleTab(r.id)}
                        className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${roleTab === r.id ? 'bg-black text-white' : 'bg-white border-2 border-black hover:bg-gray-100 text-black'}`}
                     >
                        {r.label}
                     </button>
                  ))}
               </div>
            </div>
            <button
               onClick={() => setShowForm(!showForm)}
               className="px-8 py-4 border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest bg-black text-white hover:bg-red-600 transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2"
            >
               <UserPlus size={16} /> Tạo {getRoleLabel(roleTab)}
            </button>
         </div>

         {/* Form tạo User */}
         {showForm && (
            <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm space-y-6">
               <h3 className="text-lg font-black uppercase tracking-tighter border-b-2 border-black/5 pb-4 text-black">Tạo tài khoản {getRoleLabel(roleTab)} mới</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Họ tên</label>
                     <input
                        type="text" value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        placeholder="Nguyễn Văn A"
                        className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 text-black"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Email *</label>
                     <input
                        type="email" value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder={`${roleTab}@uteshop.vn`}
                        className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 text-black"
                     />
                  </div>
                  {roleTab !== 'shipper' ? (
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Mật khẩu *</label>
                        <input
                           type="password" value={form.password}
                           onChange={e => setForm({ ...form, password: e.target.value })}
                           placeholder="••••••••"
                           className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 text-black"
                        />
                     </div>
                  ) : (
                     <>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Số điện thoại *</label>
                           <input
                              type="text" value={form.phone}
                              onChange={e => setForm({ ...form, phone: e.target.value })}
                              placeholder="09xxxxxxxx"
                              className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Giới tính</label>
                           <select
                              value={form.gender}
                              onChange={e => setForm({ ...form, gender: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 text-black bg-white"
                           >
                              <option value="MALE">Nam</option>
                              <option value="FEMALE">Nữ</option>
                              <option value="OTHER">Khác</option>
                           </select>
                        </div>
                     </>
                  )}
               </div>
               <div className="flex gap-4">
                  <button
                     onClick={handleCreateUser} disabled={submitting}
                     className="px-8 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 flex items-center gap-2"
                  >
                     {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Xác nhận tạo
                  </button>
                  <button
                     onClick={() => setShowForm(false)}
                     className="px-8 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all text-black"
                  >
                     Hủy
                  </button>
               </div>
            </div>
         )}

         {/* Bảng danh sách */}
         <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm">
            {loading ? (
               <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
               </div>
            ) : users.length === 0 ? (
               <div className="text-center py-20">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Chưa có tài khoản nào</p>
               </div>
            ) : (
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b-2 border-black/5 bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="px-8 py-6">Thành viên</th>
                        <th className="px-8 py-6">Email</th>
                        <th className="px-8 py-6">Trạng thái</th>
                        <th className="px-8 py-6">Ngày tạo</th>
                        <th className="px-8 py-6 text-right">Thao tác</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/5">
                     {users.map((u: any) => (
                        <tr key={u.id} className="hover:bg-red-50/30 transition-colors">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setSelectedUser(u)}>
                                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-black text-red-600 text-sm border-2 border-black/10 overflow-hidden">
                                    {u.profile?.avatar_url ? (
                                       <img src={getAvatarUrl(u.profile.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                       u.profile?.full_name?.[0]?.toUpperCase() || "U"
                                    )}
                                 </div>
                                 <span className="text-sm font-black uppercase group-hover:text-red-600 transition-colors">{u.profile?.full_name || "Chưa cập nhật"}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-xs font-bold text-gray-500">{u.email}</td>
                           <td className="px-8 py-6">
                              <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border-2 border-black ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                 {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-xs font-bold text-gray-400">
                              {new Date(u.created_at).toLocaleDateString("vi-VN")}
                           </td>
                           <td className="px-8 py-6 text-right space-x-2">
                              <button onClick={() => setSelectedUser(u)} className="p-2.5 border-2 border-black rounded-xl text-gray-600 hover:bg-gray-100 transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Xem thông tin">
                                 <Eye size={14} />
                              </button>
                              {u.status === 'ACTIVE' ? (
                                 <button onClick={() => handleLock(u.id)} className="p-2.5 border-2 border-black rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Khóa tài khoản">
                                    <Lock size={14} />
                                 </button>
                              ) : (
                                 <button onClick={() => handleUnlock(u.id)} className="p-2.5 border-2 border-black rounded-xl text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Mở khóa tài khoản">
                                    <LockOpen size={14} />
                                 </button>
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>

         {/* Modal Profile */}
         {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedUser(null)}>
               <div className="bg-white border-[3px] border-black rounded-[2rem] p-8 max-w-md w-full shadow-brutal relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                     <X size={20} />
                  </button>
                  <h3 className="text-2xl font-serif font-black tracking-tighter uppercase mb-6 border-b-2 border-black pb-4 text-center text-black">Hồ sơ người dùng</h3>

                  {!isEditingUser ? (
                     <>
                        <div className="flex flex-col items-center mb-6">
                           <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center font-black text-red-600 text-3xl border-4 border-black overflow-hidden shadow-subtle mb-4">
                              {selectedUser.profile?.avatar_url ? (
                                 <img src={getAvatarUrl(selectedUser.profile.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                 selectedUser.profile?.full_name?.[0]?.toUpperCase() || "U"
                              )}
                           </div>
                           <h4 className="text-xl font-black uppercase text-black">{selectedUser.profile?.full_name || "Chưa cập nhật"}</h4>
                           <p className="text-xs font-bold text-gray-500">{selectedUser.email}</p>
                        </div>

                        <div className="space-y-4 text-black">
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Số điện thoại</span>
                              <span className="text-sm font-bold">{selectedUser.phone || "Trống"}</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Ngày sinh</span>
                              <span className="text-sm font-bold">{selectedUser.profile?.birthday ? new Date(selectedUser.profile.birthday).toLocaleDateString("vi-VN") : "Trống"}</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Giới tính</span>
                              <span className="text-sm font-bold">{selectedUser.profile?.gender || "Trống"}</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                              <span className="text-xs font-black uppercase text-gray-400">Địa chỉ</span>
                              <span className="text-sm font-bold truncate max-w-[200px]" title={selectedUser.profile?.address}>{selectedUser.profile?.address || "Trống"}</span>
                           </div>

                           <button
                              onClick={() => setIsEditingUser(true)}
                              className="mt-6 w-full py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-y-[2px]"
                           >
                              Chỉnh sửa tài khoản
                           </button>
                        </div>
                     </>
                  ) : (
                     <div className="space-y-4 text-black text-left mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="flex flex-col items-center mb-6">
                           <div
                              onClick={() => document.getElementById('user-avatar-input')?.click()}
                              className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center font-black text-red-600 text-3xl border-4 border-black overflow-hidden shadow-subtle mb-2 cursor-pointer relative group"
                              title="Click để thay đổi ảnh đại diện"
                           >
                              {userAvatarFile ? (
                                 <img src={URL.createObjectURL(userAvatarFile)} alt="avatar preview" className="w-full h-full object-cover" />
                              ) : userForm.avatar_url ? (
                                 <img src={getAvatarUrl(userForm.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                 userForm.full_name?.[0]?.toUpperCase() || "U"
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <span className="text-white text-[10px] font-bold uppercase text-center leading-tight">Thay đổi<br />ảnh</span>
                              </div>
                           </div>
                           <input
                              id="user-avatar-input"
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                 if (e.target.files && e.target.files[0]) {
                                    setUserAvatarFile(e.target.files[0]);
                                 }
                              }}
                              className="hidden"
                           />
                           <p className="text-[9px] font-black uppercase text-gray-400">Click vào ảnh để thay đổi</p>
                        </div>

                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Họ và tên</label>
                           <input
                              type="text" value={userForm.full_name}
                              onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Email</label>
                           <input
                              type="email" value={userForm.email}
                              onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Số điện thoại</label>
                           <input
                              type="text" value={userForm.phone}
                              onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Giới tính</label>
                           <select
                              value={userForm.gender}
                              onChange={e => setUserForm({ ...userForm, gender: e.target.value })}
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
                              type="date" value={userForm.birthday ? userForm.birthday.slice(0, 10) : ''}
                              onChange={e => setUserForm({ ...userForm, birthday: e.target.value })}
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Mật khẩu mới (Để trống nếu không đổi)</label>
                           <input
                              type="password" value={userForm.password}
                              onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                              placeholder="••••••••"
                              className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                           />
                        </div>
                        <div className="flex gap-4 mt-6">
                           <button
                              onClick={handleUpdateUserProfile}
                              className="flex-grow py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-y-[2px]"
                           >
                              Lưu thay đổi
                           </button>
                           <button
                              onClick={() => setIsEditingUser(false)}
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
      </div>
   );
};

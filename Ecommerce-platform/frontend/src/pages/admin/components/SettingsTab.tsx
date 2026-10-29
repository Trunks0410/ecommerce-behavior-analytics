import { useState, useEffect, useCallback } from 'react';
import {
   Settings,
   DollarSign,
   CreditCard,
   FileDown,
   Save,
   FolderTree,
   Plus,
   Check,
   Trash2,
   Loader2,
} from 'lucide-react';
import { adminService } from '@/services/adminService';

interface SettingsTabProps {
   showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
   showConfirm: (message: string, onConfirm: () => void) => void;
}

export const SettingsTab = ({ showToast, showConfirm }: SettingsTabProps) => {
   const [settings, setSettings] = useState<any[]>([]);
   const [categories, setCategories] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [editValues, setEditValues] = useState<Record<string, string>>({});
   const [savingKey, setSavingKey] = useState<string | null>(null);
   const [showCatForm, setShowCatForm] = useState(false);
   const [catForm, setCatForm] = useState({ name: '', description: '' });

   const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
         const [settingsRes, catRes] = await Promise.all([
            adminService.getSettings(),
            adminService.getCategories(),
         ]);
         setSettings(settingsRes.data || []);
         setCategories(catRes.data || []);
         // Init edit values
         const vals: Record<string, string> = {};
         (settingsRes.data || []).forEach((s: any) => { vals[s.setting_key] = s.setting_value; });
         setEditValues(vals);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => { fetchAll(); }, [fetchAll]);

   const handleSaveSetting = async (key: string) => {
      setSavingKey(key);
      try {
         await adminService.updateSetting(key, editValues[key]);
         showToast("Cập nhật thông số thành công!", "success");
         fetchAll();
      } catch (e: any) {
         showToast(e.response?.data?.message || "Lỗi cập nhật", "error");
      } finally {
         setSavingKey(null);
      }
   };

   const handleCreateCategory = async () => {
      if (!catForm.name) return showToast("Tên danh mục là bắt buộc", "error");
      try {
         await adminService.createCategory({ name: catForm.name, description: catForm.description });
         setCatForm({ name: '', description: '' });
         setShowCatForm(false);
         showToast("Tạo danh mục thành công!", "success");
         fetchAll();
      } catch (e: any) {
         showToast(e.response?.data?.message || "Lỗi tạo danh mục", "error");
      }
   };

   const handleDeleteCategory = (id: number) => {
      showConfirm("Xác nhận xóa danh mục này?", async () => {
         try {
            await adminService.deleteCategory(id);
            showToast("Xóa danh mục thành công!", "success");
            fetchAll();
         } catch (e: any) {
            showToast(e.response?.data?.message || "Lỗi xóa danh mục", "error");
         }
      });
   };

   // Nhóm settings hiển thị đẹp
   const financialSettings = [
      { key: 'default_commission_rate', label: 'Tỷ lệ chiết khấu sàn', unit: '%', icon: <DollarSign size={18} className="text-green-500" /> },
      { key: 'payment_gateway_fee', label: 'Phí cổng thanh toán', unit: '%', icon: <CreditCard size={18} className="text-blue-500" /> },
      { key: 'tax_rate', label: 'Thuế giao dịch', unit: '%', icon: <FileDown size={18} className="text-purple-500" /> },
   ];

   if (loading) {
      return (
         <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="animate-spin text-gray-400" />
         </div>
      );
   }

   return (
      <div className="space-y-10">
         <div>
            <h1 className="text-3xl font-serif font-black tracking-tighter uppercase">Cấu hình thông số hệ thống</h1>
            <p className="text-gray-400 font-medium text-sm mt-1 italic">Thiết lập định mức tài chính và danh mục gốc cho sàn thời trang</p>
         </div>

         {/* Cấu hình tài chính */}
         <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
               <Settings size={20} /> Cấu hình tài chính cố định
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {financialSettings.map(fs => {
                  const current = editValues[fs.key] || '';
                  const original = settings.find((s: any) => s.setting_key === fs.key)?.setting_value || '';
                  const changed = current !== original;

                  return (
                     <div key={fs.key} className="border-2 border-black/10 rounded-2xl p-6 hover:border-black transition-all">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-black/5">{fs.icon}</div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{fs.label}</label>
                        </div>
                        <div className="flex items-center gap-2">
                           <input
                              type="number" step="0.01" value={current}
                              onChange={e => setEditValues({ ...editValues, [fs.key]: e.target.value })}
                              className="flex-grow border-2 border-black rounded-xl px-4 py-3 font-black text-lg focus:outline-none focus:ring-4 focus:ring-red-500/10 text-center"
                           />
                           <span className="text-lg font-black text-gray-400">{fs.unit}</span>
                        </div>
                        {changed && (
                           <button
                              onClick={() => handleSaveSetting(fs.key)} disabled={savingKey === fs.key}
                              className="mt-4 w-full py-2.5 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                              {savingKey === fs.key ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Lưu thay đổi
                           </button>
                        )}
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Cấu hình ví điểm */}
         <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
               <DollarSign size={20} /> Quy định ví điểm
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[
                  { key: 'LOYALTY_POINT_EARN_RATE', label: 'Tỷ lệ tích điểm', unit: 'VND = 1 Điểm', icon: <DollarSign size={18} className="text-orange-500" /> },
                  { key: 'LOYALTY_POINT_REDEEM_RATE', label: 'Tỷ lệ quy đổi điểm', unit: 'VND = 1 Điểm', icon: <CreditCard size={18} className="text-orange-500" /> },
               ].map(fs => {
                  const current = editValues[fs.key] || '';
                  const original = settings.find((s: any) => s.setting_key === fs.key)?.setting_value || '';
                  const changed = current !== original;

                  return (
                     <div key={fs.key} className="border-2 border-black/10 rounded-2xl p-6 hover:border-black transition-all">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-black/5">{fs.icon}</div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{fs.label}</label>
                        </div>
                        <div className="flex items-center gap-2">
                           <input
                              type="number" step="1" value={current}
                              onChange={e => setEditValues({ ...editValues, [fs.key]: e.target.value })}
                              className="flex-grow border-2 border-black rounded-xl px-4 py-3 font-black text-lg focus:outline-none focus:ring-4 focus:ring-red-500/10 text-center"
                           />
                           <span className="text-lg font-black text-gray-400">{fs.unit}</span>
                        </div>
                        {changed && (
                           <button
                              onClick={() => handleSaveSetting(fs.key)} disabled={savingKey === fs.key}
                              className="mt-4 w-full py-2.5 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                              {savingKey === fs.key ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Lưu thay đổi
                           </button>
                        )}
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Danh mục sản phẩm */}
         <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                  <FolderTree size={20} /> Danh mục sản phẩm gốc
               </h3>
               <button
                  onClick={() => setShowCatForm(!showCatForm)}
                  className="px-6 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-black text-white hover:bg-red-600 transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2"
               >
                  <Plus size={14} /> Thêm danh mục
               </button>
            </div>

            {showCatForm && (
               <div className="mb-8 p-6 bg-gray-50 border-2 border-black/10 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Tên danh mục *</label>
                        <input
                           type="text" value={catForm.name}
                           onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                           placeholder="VD: Áo, Quần, Đầm..."
                           className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Mô tả</label>
                        <input
                           type="text" value={catForm.description}
                           onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                           placeholder="Mô tả ngắn"
                           className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10"
                        />
                     </div>
                  </div>
                  <button onClick={handleCreateCategory} className="px-6 py-2.5 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all flex items-center gap-2">
                     <Check size={12} /> Tạo
                  </button>
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {categories.filter((c: any) => !c.parent_id).map((cat: any) => (
                  <div key={cat.id} className="border-2 border-black/10 rounded-2xl p-5 flex items-center justify-between hover:border-black transition-all group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-black border-2 border-black/5">
                           {cat.name[0]}
                        </div>
                        <div>
                           <p className="text-sm font-black">{cat.name}</p>
                           <p className="text-[10px] text-gray-400 font-bold">{cat.slug}</p>
                        </div>
                     </div>
                     <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 rounded-xl text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Xóa danh mục"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

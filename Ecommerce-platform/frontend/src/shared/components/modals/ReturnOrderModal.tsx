import { useState } from "react";
import { Order } from "@/shared/types/order.types";
import { useCreateReturnRequest } from "@/hooks/useReturns";
import { axiosClient } from "@/shared/api/axiosClient";
import toast from "react-hot-toast";
import { useLanguage } from "@/shared/context/LanguageContext";

interface ReturnOrderModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnOrderModal = ({ order, isOpen, onClose }: ReturnOrderModalProps) => {
  const { mutate: createReturn, isPending } = useCreateReturnRequest();
  const { t } = useLanguage();
  
  const uploadImages = async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append("images", file));
    const response = await axiosClient.post("/user/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  };
  
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: { selected: boolean; quantity: number } }>({});
  const [reason, setReason] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleItemToggle = (itemId: number, maxQuantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: prev[itemId]?.selected
        ? { selected: false, quantity: 1 }
        : { selected: true, quantity: maxQuantity }
    }));
  };

  const handleQuantityChange = (itemId: number, quantity: number, maxQuantity: number) => {
    if (quantity < 1 || quantity > maxQuantity) return;
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const returnItems = Object.entries(selectedItems)
      .filter(([_, data]) => data.selected)
      .map(([itemId, data]) => ({
        orderItemId: Number(itemId),
        quantity: data.quantity,
      }));

    if (returnItems.length === 0) {
      toast.error(t("return_select_item_error"));
      return;
    }

    if (!reason) {
      toast.error(t("return_reason_error"));
      return;
    }

    if (evidenceFiles.length === 0) {
      toast.error(t("return_evidence_error"));
      return;
    }

    let evidenceUrls: string[] = [];
    if (evidenceFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadRes = await uploadImages(evidenceFiles);
        evidenceUrls = uploadRes.data; // Server returns { message, data: urls }
      } catch (err) {
        toast.error(t("return_upload_error"));
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    createReturn({
      shopOrderId: order.id,
      reason,
      evidenceUrls,
      returnItems
    }, {
      onSuccess: () => onClose()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 text-gray-900 shadow-xl dark:bg-slate-900 dark:text-slate-100">
        <h2 className="mb-6 text-xl font-bold">{t("return_modal_title")}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold text-gray-800 dark:text-slate-200">{t("return_select_products")}</h3>
            <div className="space-y-3">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5"
                      checked={selectedItems[item.id]?.selected || false}
                      onChange={() => handleItemToggle(item.id, item.quantity)}
                    />
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{t("return_quantity_short")} {item.quantity}</p>
                    </div>
                  </div>
                  
                  {selectedItems[item.id]?.selected && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t("return_quantity")}</span>
                      <input 
                        type="number" 
                        min="1" 
                        max={item.quantity}
                        value={selectedItems[item.id]?.quantity || 1}
                        onChange={(e) => handleQuantityChange(item.id, Number(e.target.value), item.quantity)}
                        className="w-16 rounded border border-gray-300 bg-white p-1 text-center dark:border-slate-600 dark:bg-slate-800"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700 dark:text-slate-300">
              {t("return_reason")} <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder={t("return_reason_placeholder")}
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700 dark:text-slate-300">
              {t("return_evidence")}
            </label>
            <input 
              type="file" 
              multiple
              accept="image/jpeg, image/jpg, image/png, image/webp"
              onChange={(e) => {
                if (e.target.files) {
                  const newFiles = Array.from(e.target.files);
                  if (evidenceFiles.length + newFiles.length > 5) {
                    alert(t("return_max_images_error"));
                    return;
                  }
                  setEvidenceFiles([...evidenceFiles, ...newFiles]);
                }
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-400 dark:file:bg-slate-700 dark:file:text-slate-100"
            />
            {evidenceFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {evidenceFiles.map((file, index) => (
                  <div key={index} className="relative w-20 h-20 border rounded-md overflow-hidden group">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = [...evidenceFiles];
                        newFiles.splice(index, 1);
                        setEvidenceFiles(newFiles);
                      }}
                      className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending || isUploading}
              className="rounded-lg px-6 py-2 font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending || isUploading ? t("return_submitting") : t("return_submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import {
  LayoutDashboard,
  ShoppingCart,
  Percent,
  Wallet,
  MessageSquare,
  ExternalLink,
  Plus,
  Heart,
  Clock,
  CheckCircle2,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  MessageCircle,
  Send,
  ChevronDown,
  Package,
  RefreshCcw,
  Star,
  ShoppingBag,
  Search,
  TrendingUp,
  Store,
  X,
  AlertCircle,
  BookOpen,
  FileText,
  Download,
  Loader2,
  Save,
  Paperclip,
  Eye,
  EyeOff
} from 'lucide-react';
import { getOrderStatusLabel } from '@/shared/utils/statusUtils';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import useAuth from '@/hooks/useAuth';
import { vendorService, ShopProfileData, ProductData, VoucherData } from '@/services/vendorService';
import { chatService } from '@/services/chatService';
import { NotificationDropdown } from '@/shared/components/layout/NotificationDropdown';
import EmojiPicker from '@/shared/components/chat/EmojiPicker';


const DEFAULT_SHOP_LOGO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='128' height='128'><rect width='100' height='100' fill='%23FFE4D6' stroke='black' stroke-width='4'/><path d='M20 40 L50 15 L80 40 L80 85 L20 85 Z' fill='white' stroke='black' stroke-width='4'/><rect x='40' y='55' width='20' height='30' fill='%23D97736' stroke='black' stroke-width='4'/><path d='M15 40 L85 40' stroke='black' stroke-width='4'/></svg>";

// Gọi API danh mục để hiển thị trong form thêm/sửa sản phẩm
import { publicAxios } from "@/shared/api/axiosClient";

interface CustomSelectProps {
  label: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CustomSelect = ({
  label,
  value,
  options,
  onChange,
  placeholder = "-- Chọn --",
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(
    (opt) => opt.value?.toString() === value?.toString(),
  );
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="space-y-2 relative" ref={selectRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold text-left focus:outline-none flex justify-between items-center transition-all select-none hover:bg-gray-100/50 shadow-sm active:translate-y-[1px]"
      >
        <span className="text-xs font-bold">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={20}
          className={`transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ strokeWidth: 3 }}
        />
      </button>
      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-black rounded-none z-50 shadow-lg max-h-60 overflow-y-auto divide-y divide-black/10 animate-in fade-in slide-in-from-top-1 duration-150 custom-scrollbar">
          {options.map((opt) => {
            const isSelected = opt.value.toString() === value?.toString();
            return (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value.toString());
                  setIsOpen(false);
                }}
                className={`px-5 py-3 text-xs font-bold cursor-pointer transition-colors ${isSelected
                  ? "bg-primary/25 text-black font-black"
                  : "hover:bg-gray-50 text-gray-700 hover:text-black"
                  }`}
              >
                <span>{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const VendorDashboard = () => {
  const { user, handleLogout, handleInitAuth } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shop state
  const [shopInfo, setShopInfo] = useState<ShopProfileData | null>(null);

  // Form Đăng ký Shop
  const [registerForm, setRegisterForm] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
    industry: "Thời trang Nam"
  });

  // Overview Stats state
  const [stats, setStats] = useState<{
    revenue: number;
    netRevenue: number;
    availableBalance: number;
    pendingBalance: number;
    withdrawnAmount: number;
    ordersCount: number;
    productsCount: number;
    commentsCount: number;
    dailyRevenue: number[];
  }>({
    revenue: 0,
    netRevenue: 0,
    availableBalance: 0,
    pendingBalance: 0,
    withdrawnAmount: 0,
    ordersCount: 0,
    productsCount: 0,
    commentsCount: 0,
    dailyRevenue: [0, 0, 0, 0, 0, 0, 0],
  });

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("ALL");
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [isReplying, setIsReplying] = useState<Record<number, boolean>>({});
  const [productView, setProductView] = useState<"list" | "add" | "edit">(
    "list",
  );
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Biến thể state
  const [hasVariants, setHasVariants] = useState(false);
  const [productVariants, setProductVariants] = useState<any[]>([]);

  // State nhập nhanh biến thể
  const [bulkSizes, setBulkSizes] = useState("");
  const [bulkColors, setBulkColors] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkSalePrice, setBulkSalePrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    category_id: "",
    brand_id: "",
    description: "",
    price: 0,
    sale_price: "",
    gender: "UNISEX",
    material: "",
    stock_quantity: 10,
    image_url: "",
    is_new: false,
    is_featured: false
  });

  const [productImageType, setProductImageType] = useState<"url" | "file">(
    "url",
  );
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [shopAvatarType, setShopAvatarType] = useState<"url" | "file">("url");
  const [shopCoverType, setShopCoverType] = useState<"url" | "file">("url");
  const [isUploadingShopImage, setIsUploadingShopImage] = useState(false);

  // States cho quản lý nhiều ảnh chính sản phẩm (Gallery)
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string>("");
  const [showPrimaryConfirm, setShowPrimaryConfirm] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [activeChatIndex, setActiveChatIndex] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevTotalUnreadRef = useRef<number>(0);
  const isInitialUnreadLoad = useRef<boolean>(true);
  const chatMessagesLengthRef = useRef<number>(0);

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  // Auto-fill shop's default bank details when shopInfo is loaded
  useEffect(() => {
    if (shopInfo) {
      setWithdrawForm(prev => ({
        ...prev,
        bankName: prev.bankName || shopInfo.bank_name || "",
        accountNumber: prev.accountNumber || shopInfo.bank_account_no || "",
        accountName: prev.accountName || shopInfo.bank_account_name || ""
      }));
    }
  }, [shopInfo]);

  const [showSavedBanksModal, setShowSavedBanksModal] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);

  const handleSaveDefaultBank = async () => {
    if (!withdrawForm.bankName || !withdrawForm.accountNumber || !withdrawForm.accountName) {
      alert("Vui lòng điền đầy đủ thông tin ngân hàng trước khi lưu!");
      return;
    }
    setIsSavingBank(true);
    try {
      await vendorService.updateMyShopInfo({
        name: settingsForm.name,
        phone: settingsForm.phone,
        address: settingsForm.address,
        industry: settingsForm.industry,
        description: settingsForm.description,
        bank_name: withdrawForm.bankName,
        bank_account_no: withdrawForm.accountNumber,
        bank_account_name: withdrawForm.accountName
      });

      const res = await vendorService.getMyShopInfo();
      if (res && res.data) {
        setShopInfo(res.data);
      }
      alert("Lưu thông tin tài khoản mặc định thành công!");
    } catch (err: any) {
      console.error("Lỗi lưu tài khoản mặc định:", err);
      alert(err.response?.data?.message || "Không thể lưu thông tin tài khoản. Vui lòng thử lại!");
    } finally {
      setIsSavingBank(false);
    }
  };

  const getHistoricalBankAccounts = () => {
    const list: Array<{ bank_name: string; bank_account: string; bank_account_name: string; type: "SAVED" | "HISTORY" }> = [];

    if (shopInfo?.bank_name && shopInfo?.bank_account_no) {
      list.push({
        bank_name: shopInfo.bank_name,
        bank_account: shopInfo.bank_account_no,
        bank_account_name: shopInfo.bank_account_name || "",
        type: "SAVED"
      });
    }

    withdrawals.forEach(w => {
      const bankName = w.bank_name;
      const bankAcc = w.bank_account || w.account_number;
      const bankAccName = w.bank_account_name || w.account_name;

      if (bankName && bankAcc) {
        const exists = list.some(item => item.bank_account === bankAcc);
        if (!exists) {
          list.push({
            bank_name: bankName,
            bank_account: bankAcc,
            bank_account_name: bankAccName || "",
            type: "HISTORY"
          });
        }
      }
    });

    return list;
  };

  // Promos state
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    description: "",
    discount_type: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    discount_value: 0,
    min_order_amount: 0,
    max_discount: "",
    usage_limit: "",
    per_user_limit: 1,
    start_date: "",
    end_date: "",
    category_id: "",
  });

  // Returns state
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    returnId: number | null;
    rejectNote: string;
  }>({
    isOpen: false,
    returnId: null,
    rejectNote: "",
  });

  const REJECT_SUGGESTIONS = [
    "Sản phẩm không có dấu hiệu lỗi",
    "Sản phẩm đã qua sử dụng, không còn nguyên vẹn",
    "Hình ảnh minh chứng không rõ ràng",
    "Lý do không hợp lệ theo chính sách cửa hàng",
    "Quá thời hạn đổi trả",
  ];

  const handleOpenRejectModal = (returnId: number) => {
    setRejectModal({ isOpen: true, returnId, rejectNote: "" });
  };

  const handleSubmitReject = async () => {
    if (!rejectModal.returnId) return;
    try {
      await vendorService.rejectReturnRequest(rejectModal.returnId, rejectModal.rejectNote);
      setRejectModal({ isOpen: false, returnId: null, rejectNote: "" });
      fetchShopReturns();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi từ chối");
    }
  };

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    phone: "",
    address: "",
    industry: "",
    description: "",
    avatar_url: "",
    cover_url: "",
  });

  // Tải thông tin Shop khi component được mount hoặc user thay đổi
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const res = await vendorService.getMyShopInfo();
        if (res && res.data) {
          setShopInfo(res.data);
          setIsRegistered(true);
          // Gán giá trị form cấu hình shop
          setSettingsForm({
            name: res.data.name || "",
            phone: res.data.phone || "",
            address: res.data.address || "",
            industry: res.data.industry || "",
            description: res.data.description || "",
            avatar_url: res.data.avatar_url || "",
            cover_url: res.data.cover_url || "",
          });
        }
      } catch (err) {
        console.log("Chưa đăng ký shop hoặc lỗi:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchShopData();
    }
  }, [user]);

  // Tải danh mục sản phẩm từ backend
  useEffect(() => {
    publicAxios
      .get("/categories")
      .then((res) => {
        if (res.data && res.data.data) {
          setCategories(res.data.data);
        }
      })
      .catch((err) => console.log("Lỗi tải danh mục:", err));
  }, []);

  const fetchShopReturns = async () => {
    try {
      const res = await vendorService.getShopReturnRequests(1, 50, "ALL");
      if (res && res.returns) {
        setReturnRequests(res.returns);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tải thương hiệu sản phẩm từ backend
  useEffect(() => {
    publicAxios
      .get("/brands")
      .then((res) => {
        if (res.data && res.data.data) {
          setBrands(res.data.data);
        }
      })
      .catch((err) => console.log("Lỗi tải thương hiệu:", err));
  }, []);

  // Tải dữ liệu các tab tương ứng khi hoạt động
  useEffect(() => {
    if (!isRegistered || !shopInfo) return;

    if (activeTab === "overview") {
      vendorService
        .getShopStatistics()
        .then((res) => {
          if (res && res.data) {
            setStats(res.data);
          }
        })
        .catch((err) => console.log("Lỗi tải thống kê:", err));
    } else if (activeTab === "products") {
      fetchShopProducts();
    } else if (activeTab === "orders") {
      fetchShopOrders();
    } else if (activeTab === "promos") {
      fetchShopVouchers();
    } else if (activeTab === "interactions") {
      fetchShopReviews();
    } else if (activeTab === "finance") {
      fetchWithdrawalHistory();
    } else if (activeTab === "returns") {
      fetchShopReturns();
    }
  }, [activeTab, isRegistered, shopInfo, productsPage]);

  // Polling lấy danh sách cuộc trò chuyện cho Vendor
  useEffect(() => {
    if (activeTab !== "chats" || !isRegistered) return;

    const fetchConversations = async () => {
      try {
        const res = await chatService.getConversations();
        if (res && res.data) {
          const totalUnread = res.data.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
          if (!isInitialUnreadLoad.current && totalUnread > prevTotalUnreadRef.current) {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav");
            audio.play().catch(e => console.log("Blocked audio play:", e));
          }
          isInitialUnreadLoad.current = false;
          prevTotalUnreadRef.current = totalUnread;
          setConversations(res.data);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách cuộc trò chuyện:", err);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [activeTab, isRegistered]);

  // Polling lấy tin nhắn chat thực tế giữa Vendor và Khách hàng
  useEffect(() => {
    if (activeTab !== "chats" || !isRegistered || conversations.length === 0)
      return;

    const partner = conversations[activeChatIndex]?.partner;
    if (!partner) return;

    chatMessagesLengthRef.current = 0;

    const fetchChat = async () => {
      try {
        const res = await chatService.getChatHistory(partner.id);
        if (res && res.data) {
          if (chatMessagesLengthRef.current > 0 && res.data.length > chatMessagesLengthRef.current) {
            const lastNewMsg = res.data[res.data.length - 1];
            if (lastNewMsg.sender_id !== user?.id) {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav");
              audio.play().catch(e => console.log("Blocked audio play:", e));
            }
          }
          chatMessagesLengthRef.current = res.data.length;
          setChatMessages(res.data);
        }
      } catch (err) {
        console.error("Lỗi lấy lịch sử chat:", err);
      }
    };

    fetchChat();

    const interval = setInterval(fetchChat, 3000); // Poll sau mỗi 3 giây
    return () => clearInterval(interval);
  }, [activeTab, activeChatIndex, isRegistered, conversations]);

  const fetchShopProducts = async () => {
    if (!shopInfo) return;
    try {
      const res = await vendorService.getMyShopProducts({
        page: productsPage,
        limit: 5,
      });
      if (res && res.data) {
        setProducts(res.data.products);
        setProductsTotal(res.data.total);
      }
    } catch (err) {
      console.log("Lỗi tải sản phẩm:", err);
    }
  };

  const fetchShopOrders = async () => {
    try {
      const res = await vendorService.getShopOrders();
      if (res && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.log("Lỗi tải đơn hàng:", err);
    }
  };

  const fetchShopVouchers = async () => {
    if (!shopInfo) return;
    try {
      const res = await vendorService.getShopVouchers(shopInfo.id);
      if (res && res.data) {
        setVouchers(res.data);
      }
    } catch (err) {
      console.log("Lỗi tải vouchers:", err);
    }
  };

  const fetchShopReviews = async () => {
    try {
      const res = await vendorService.getShopReviews();
      if (res && res.data) {
        setReviews(res.data);
      }
    } catch (err) {
      console.log("Lỗi tải bình luận:", err);
    }
  };

  const handleReplyReview = async (reviewId: number) => {
    const reply = replyTexts[reviewId];
    if (!reply || !reply.trim()) {
      alert("Vui lòng nhập nội dung phản hồi");
      return;
    }

    try {
      setIsReplying(prev => ({ ...prev, [reviewId]: true }));
      await vendorService.replyToReview(reviewId, reply);
      alert("Gửi phản hồi thành công!");
      fetchShopReviews();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || "Lỗi khi gửi phản hồi");
    } finally {
      setIsReplying(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  // --- HÀNH ĐỘNG XỬ LÝ (Handlers) ---

  const handleProductImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (galleryImages.length >= 5) {
      alert("Bạn chỉ được tải lên tối đa 5 ảnh chính cho sản phẩm!");
      return;
    }

    try {
      setIsUploadingProductImage(true);
      const res = await vendorService.uploadImage(file);
      if (res && res.url) {

        const newUrl = res.url;
        if (galleryImages.length === 0) {
          setGalleryImages([newUrl]);
          setPrimaryImageUrl(newUrl);
          setProductForm(prev => ({ ...prev, image_url: newUrl }));
        } else {
          setGalleryImages(prev => [...prev, newUrl]);
          setPendingImageUrl(newUrl);
          setShowPrimaryConfirm(true);
        }

      }
    } catch (err) {
      console.error(err);
      alert("Tải ảnh lên thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleShopAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingShopImage(true);
      const res = await vendorService.uploadImage(file);
      if (res && res.url) {
        setSettingsForm((prev) => ({ ...prev, avatar_url: res.url }));
      }
    } catch (err) {
      console.error(err);
      alert("Tải ảnh đại diện thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploadingShopImage(false);
    }
  };

  const handleShopCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingShopImage(true);
      const res = await vendorService.uploadImage(file);
      if (res && res.url) {
        setSettingsForm((prev) => ({ ...prev, cover_url: res.url }));
      }
    } catch (err) {
      console.error(err);
      alert("Tải ảnh bìa thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploadingShopImage(false);
    }
  };


  // Đăng ký gian hàng
  const handleRegisterShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vendorService.registerShop(registerForm);
      if (res && res.data) {
        setShopInfo(res.data);
        setIsRegistered(true);
        if (handleInitAuth) {
          await handleInitAuth();
        }
        alert("Khởi tạo gian hàng thành công!");
      }
    } catch (err) {
      console.error(err);
      alert("Đăng ký thất bại. Vui lòng thử lại!");
    }
  };


  // Tạo & Cập nhật sản phẩm
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // VALIDATION GIÁ
      if (!hasVariants) {
        const basePrice = parseFloat(productForm.price.toString());
        if (isNaN(basePrice) || basePrice <= 0) {
          alert("Giá bán gốc của sản phẩm phải lớn hơn 0!");
          return;
        }
        if (productForm.sale_price) {
          const salePriceVal = parseFloat(productForm.sale_price.toString());
          if (isNaN(salePriceVal) || salePriceVal < 0) {
            alert("Giá khuyến mãi phải lớn hơn hoặc bằng 0!");
            return;
          }
          if (salePriceVal > basePrice) {
            alert("Giá khuyến mãi không được lớn hơn giá bán gốc!");
            return;
          }
        }
      } else {
        if (productVariants.length === 0) {
          alert(
            "Vui lòng thêm ít nhất một biến thể hoặc tắt chế độ đa biến thể!",
          );
          return;
        }
        for (let i = 0; i < productVariants.length; i++) {
          const v = productVariants[i];
          const vPrice = parseFloat(v.price?.toString() || "0");
          if (isNaN(vPrice) || vPrice <= 0) {
            alert(`Biến thể dòng ${i + 1} (Kích thước: ${v.size}, Màu sắc: ${v.color}) phải có giá gốc lớn hơn 0!`);
            return;
          }
          if (v.sale_price) {
            const vSalePrice = parseFloat(v.sale_price.toString());
            if (isNaN(vSalePrice) || vSalePrice < 0) {
              alert(`Biến thể dòng ${i + 1} phải có giá khuyến mãi hợp lệ!`);
              return;
            }
            if (vSalePrice > vPrice) {
              alert(`Biến thể dòng ${i + 1} có giá khuyến mãi không được lớn hơn giá gốc (${vSalePrice} > ${vPrice})!`);
              return;
            }
          }
        }
      }

      // Chuẩn bị variants
      let finalVariants: any[] = [];
      let totalStock = parseInt(productForm.stock_quantity.toString());
      let finalPrice = parseFloat(productForm.price.toString());
      let finalSalePrice: number | undefined = productForm.sale_price ? parseFloat(productForm.sale_price.toString()) : undefined;

      if (hasVariants) {
        finalVariants = productVariants.map((v) => ({
          size: v.size || "Free Size",
          color: v.color || "Default",
          color_hex: v.color_hex || "#888888",
          image_url: v.image_url || "",
          price: parseFloat(v.price.toString()),
          sale_price: v.sale_price
            ? parseFloat(v.sale_price.toString())
            : undefined,
          stock_quantity: parseInt(v.stock_quantity.toString()),
        }));
        // Tính tổng tồn kho từ tất cả biến thể

        totalStock = finalVariants.reduce((sum, v) => sum + v.stock_quantity, 0);

        // Tính toán giá chính của sản phẩm bằng biến thể có giá thực tế thấp nhất (sale_price hoặc price)
        let lowestVariant = finalVariants[0];
        let lowestEffPrice = lowestVariant.sale_price !== undefined ? lowestVariant.sale_price : lowestVariant.price;

        finalVariants.forEach((v) => {
          const effPrice = v.sale_price !== undefined ? v.sale_price : v.price;
          if (effPrice < lowestEffPrice) {
            lowestEffPrice = effPrice;
            lowestVariant = v;
          }
        });

        finalPrice = lowestVariant.price;
        finalSalePrice = lowestVariant.sale_price;
      } else {
        // Tự động map một variant mặc định nếu là đơn biến thể
        finalVariants = [{
          size: "Free Size",
          color: "Default",
          color_hex: "#888888",
          image_url: productForm.image_url || "",
          price: parseFloat(productForm.price.toString()),
          sale_price: productForm.sale_price ? parseFloat(productForm.sale_price.toString()) : undefined,
          stock_quantity: parseInt(productForm.stock_quantity.toString())
        }];

      }

      let payloadImages = galleryImages.map((url) => ({
        image_url: url,
        is_primary: url === primaryImageUrl
      }));

      if (payloadImages.length === 0 && productForm.image_url) {
        payloadImages.push({
          image_url: productForm.image_url,
          is_primary: true
        });
      }

      const payload: ProductData = {
        name: productForm.name,
        category_id: parseInt(productForm.category_id),
        brand_id: productForm.brand_id
          ? parseInt(productForm.brand_id)
          : undefined,
        description: productForm.description,
        price: finalPrice,
        sale_price: finalSalePrice,

        gender: productForm.gender,
        material: productForm.material,
        stock_quantity: totalStock,
        variants: finalVariants,

        // images: productForm.image_url
        //   ? [{ image_url: productForm.image_url }]
        //   : [],

        images: payloadImages,
        is_new: productForm.is_new,
        is_featured: productForm.is_featured

      };

      if (editingProduct) {
        await vendorService.updateProduct(editingProduct.id, payload);
        alert("Cập nhật sản phẩm thành công!");
      } else {
        await vendorService.createProduct(payload);
        alert("Thêm sản phẩm thành công!");
      }

      setProductView("list");
      setEditingProduct(null);
      fetchShopProducts();
    } catch (err) {
      console.error(err);
      alert("Lỗi xử lý sản phẩm!");
    }
  };

  const startEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || "",
      category_id: prod.category_id?.toString() || "",
      brand_id: prod.brand_id?.toString() || "",
      description: prod.description || "",
      price: prod.price || 0,
      sale_price: prod.sale_price?.toString() || "",
      gender: prod.gender || "UNISEX",
      material: prod.material || "",
      stock_quantity: prod.stock_quantity || 10,
      image_url: prod.images && prod.images[0] ? prod.images[0].image_url : "",
      is_new: prod.is_new || false,
      is_featured: prod.is_featured || false
    });

    if (prod.images && prod.images.length > 0) {
      const urls = prod.images.map((img: any) => img.image_url);
      setGalleryImages(urls);
      const primary = prod.images.find((img: any) => img.is_primary);
      setPrimaryImageUrl(primary ? primary.image_url : urls[0]);
    } else if (prod.image_url) {
      setGalleryImages([prod.image_url]);
      setPrimaryImageUrl(prod.image_url);
    } else {
      setGalleryImages([]);
      setPrimaryImageUrl("");
    }

    // Nếu sản phẩm có biến thể
    if (prod.variants && prod.variants.length > 0) {
      // Kiểm tra xem có phải là biến thể mặc định không
      const isDefault =
        prod.variants.length === 1 &&
        prod.variants[0].size === "Free Size" &&
        (prod.variants[0].color === "Default" ||
          prod.variants[0].color === "Mặc định");

      if (!isDefault) {
        setHasVariants(true);

        // setProductVariants(
        //   prod.variants.map((v: any) => ({
        //     size: v.size,
        //     color: v.color,
        //     color_hex: v.color_hex || "#888888",
        //     price: v.price || 0,
        //     sale_price: v.sale_price || "",
        //     stock_quantity: v.stock_quantity || 0,
        //   })),
        // );
        setProductVariants(prod.variants.map((v: any) => ({
          size: v.size,
          color: v.color,
          color_hex: v.color_hex || "#888888",
          image_url: v.image_url || "",
          price: v.price || 0,
          sale_price: v.sale_price || "",
          stock_quantity: v.stock_quantity || 0
        })));

      } else {
        setHasVariants(false);
        setProductVariants([]);
      }
    } else {
      setHasVariants(false);
      setProductVariants([]);
    }

    setBulkSizes("");
    setBulkColors("");
    setBulkPrice("");
    setBulkSalePrice("");
    setBulkStock("");
    setProductImageType("url");
    setProductView("edit");
  };

  const generateBulkVariants = () => {
    if (!bulkSizes && !bulkColors) {
      alert("Vui lòng nhập danh sách kích thước hoặc màu sắc để tạo!");
      return;
    }

    const sizes = bulkSizes
      ? bulkSizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      : ["Free Size"];
    const colors = bulkColors
      ? bulkColors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
      : ["Default"];

    const newVariants: any[] = [];
    sizes.forEach((size) => {
      colors.forEach((color) => {
        // Kiểm tra xem biến thể này đã tồn tại chưa để tránh trùng lặp
        const exists = productVariants.some(
          (v) =>
            v.size.toLowerCase() === size.toLowerCase() &&
            v.color.toLowerCase() === color.toLowerCase(),
        );
        if (!exists) {
          newVariants.push({
            size,
            color,
            color_hex: "#888888",
            image_url: "",
            price: parseFloat(productForm.price.toString()) || 0,
            sale_price: "",
            stock_quantity: 10,
          });
        }
      });
    });

    if (newVariants.length > 0) {
      setProductVariants([...productVariants, ...newVariants]);
      alert(`Đã tạo thêm ${newVariants.length} biến thể!`);
    } else {
      alert("Không có biến thể mới nào được tạo (có thể đã bị trùng lặp).");
    }
  };

  const applyBulkSettings = () => {
    if (productVariants.length === 0) {
      alert("Không có biến thể nào để áp dụng!");
      return;
    }

    let updated = [...productVariants];
    let hasChanges = false;

    if (bulkPrice) {
      const priceVal = parseFloat(bulkPrice);
      updated = updated.map((v) => ({ ...v, price: priceVal }));
      hasChanges = true;
    }

    if (bulkSalePrice) {
      const salePriceVal = parseFloat(bulkSalePrice);
      updated = updated.map((v) => ({ ...v, sale_price: salePriceVal }));
      hasChanges = true;
    }

    if (bulkStock) {
      const stockVal = parseInt(bulkStock);
      updated = updated.map((v) => ({ ...v, stock_quantity: stockVal }));
      hasChanges = true;
    }

    if (hasChanges) {
      setProductVariants(updated);
      alert("Đã áp dụng các thiết lập cho tất cả biến thể!");
    } else {
      alert("Vui lòng nhập Giá gốc, Giá khuyến mãi hoặc Tồn kho để áp dụng!");
    }
  };

  const addSingleVariant = () => {
    setProductVariants([
      ...productVariants,
      {
        size: "M",
        color: "Mặc định",
        color_hex: "#888888",
        image_url: "",
        price: parseFloat(productForm.price.toString()) || 0,
        sale_price: "",
        stock_quantity: 10,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    const updated = [...productVariants];
    updated.splice(index, 1);
    setProductVariants(updated);
  };

  const updateVariantField = (index: number, field: string, value: any) => {
    const updated = [...productVariants];
    const targetVariant = {
      ...updated[index],
      [field]: value,
    };
    updated[index] = targetVariant;

    // Propagation logic for same color variants
    if (field === 'color_hex') {
      const colorName = targetVariant.color;
      updated.forEach((v) => {
        if (v.color === colorName) {
          v.color_hex = value;
        }
      });
    } else if (field === 'image_url') {
      const colorName = targetVariant.color;
      updated.forEach((v) => {
        if (v.color === colorName) {
          v.image_url = value;
        }
      });
    } else if (field === 'color') {
      // Find another variant that already has this new color name
      // and grab its color_hex/image_url if they are not empty
      const existing = updated.find((v, idx) => idx !== index && v.color === value);
      if (existing) {
        targetVariant.color_hex = existing.color_hex || targetVariant.color_hex;
        targetVariant.image_url = existing.image_url || targetVariant.image_url;
      }

      // Also, propagate color_hex and image_url to other variants sharing the same color
      if (targetVariant.color_hex) {
        updated.forEach((v) => {
          if (v.color === value) {
            v.color_hex = targetVariant.color_hex;
          }
        });
      }
      if (targetVariant.image_url) {
        updated.forEach((v) => {
          if (v.color === value) {
            v.image_url = targetVariant.image_url;
          }
        });
      }
    }

    setProductVariants(updated);
  };

  const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await vendorService.uploadImage(file);
      if (res && res.url) {
        updateVariantField(index, "image_url", res.url);
      }
    } catch (err) {
      console.error(err);
      alert("Tải ảnh biến thể thất bại!");
    }
  };

  const handleToggleProductStatus = async (id: number, currentStatus: string) => {
    const isApproved = currentStatus === 'APPROVED';
    const newStatus = isApproved ? 'HIDDEN' : 'APPROVED';
    setConfirmModal({
      isOpen: true,
      title: isApproved ? "Ngừng bán sản phẩm" : "Bán trở lại sản phẩm",
      message: isApproved ? "Bạn có chắc chắn muốn ngừng bán sản phẩm này?" : "Bạn có chắc chắn muốn mở bán lại sản phẩm này?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.updateProduct(id, { approval_status: newStatus });
          alert(isApproved ? "Đã ngưng bán sản phẩm!" : "Đã mở bán lại sản phẩm!");
          fetchShopProducts();
        } catch (err) {
          console.error(err);
          alert("Lỗi khi cập nhật trạng thái sản phẩm!");
        }
      },
    });
  };

  // Xác nhận đơn hàng
  const handleConfirmOrder = async (orderId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận đơn hàng",
      message: "Bạn có chắc chắn muốn xác nhận đơn hàng này?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.confirmOrder(orderId);
          alert("Đã xác nhận đơn hàng thành công!");
          fetchShopOrders();
        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || "Lỗi khi xác nhận đơn hàng!");
        }
      },
    });
  };
  // Hủy đơn hàng
  const handleCancelOrder = async (orderId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Từ chối đơn hàng",
      message: "Bạn có chắc chắn muốn từ chối/hủy đơn hàng này? Khách hàng sẽ được hoàn lại tiền và điểm tích lũy.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.cancelOrder(orderId);
          alert("Đã hủy đơn hàng thành công!");
          fetchShopOrders();
        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || "Lỗi khi hủy đơn hàng!");
        }
      },
    });
  };

  // Chuẩn bị hàng
  const handlePrepareOrder = async (orderId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Chuẩn bị hàng",
      message:
        "Bạn có chắc chắn đã đóng gói xong và muốn chuyển trạng thái đơn hàng sang chuẩn bị hàng?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.prepareOrder(orderId);
          alert("Đã chuẩn bị hàng thành công!");
          fetchShopOrders();
        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || "Lỗi khi chuẩn bị hàng!");
        }
      },
    });
  };

  // Đang giao hàng 
  const handleReadyOrder = async (orderId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Sẵn sàng giao hàng",
      message:
        "Bạn có chắc chắn muốn chuyển trạng thái đơn hàng sang sẵn sàng giao?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.readyOrder(orderId);
          alert("Đã sẵn sàng giao thành công!");
          fetchShopOrders();
        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || "Lỗi khi cập nhật!");
        }
      },
    });
  };

  // Nhận hàng hoàn
  const handleConfirmReturn = async (orderId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận nhận hàng hoàn",
      message:
        "Bạn có chắc chắn đã nhận lại hàng hoàn từ shipper?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.confirmReturn(orderId);
          alert("Xác nhận nhận hàng hoàn thành công!");
          fetchShopOrders();
        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || "Lỗi khi cập nhật!");
        }
      },
    });
  };

  // Xử lý hàng loạt
  const handleBulkUpdate = async (status: string) => {
    let targetStatus = "";
    let actionText = "";
    if (status === "PENDING") {
      targetStatus = "CONFIRMED";
      actionText = "xác nhận tất cả";
    } else if (status === "CONFIRMED") {
      targetStatus = "PREPARING";
      actionText = "chuẩn bị tất cả";
    } else if (status === "PREPARING") {
      targetStatus = "SHIPPING";
      actionText = "sẵn sàng giao tất cả";
    } else {
      return;
    }

    const eligibleOrders = orders
      .filter((o: any) => o.status === status)
      .map((o: any) => o.id);
    if (eligibleOrders.length === 0) {
      alert(`Không có đơn hàng nào hợp lệ để ${actionText}!`);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xử lý hàng loạt",
      message: `Bạn có chắc chắn muốn ${actionText} ${eligibleOrders.length} đơn hàng này không?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.bulkUpdateOrdersStatus(
            eligibleOrders,
            targetStatus,
          );
          alert(`Đã ${actionText} thành công!`);
          fetchShopOrders();
        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || `Lỗi khi ${actionText}!`);
        }
      },
    });
  };

  // Gửi tin nhắn chat
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Dung lượng file vượt quá giới hạn cho phép (${isImage ? "5MB đối với hình ảnh" : "10MB đối với tài liệu"})`);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const res = await chatService.uploadAttachment(file);
      if (res && res.data) {
        setAttachedFile({
          url: res.data.url,
          name: res.data.name,
          type: res.data.type
        });
      }
    } catch (err) {
      console.error("Lỗi tải tệp lên:", err);
      alert("Tải tệp lên thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleTriggerFileInput = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleRemoveAttachedFile = () => {
    setAttachedFile(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = chatInputText.trim();
    if (!content && !attachedFile) return;
    if (chatCustomers.length === 0 || isUploading) return;

    const partner = chatCustomers[activeChatIndex];
    if (!partner) return;

    setChatInputText(""); // Clear input early for responsiveness
    const currentAttachment = attachedFile;
    setAttachedFile(null);

    try {
      const res = await chatService.sendMessage(
        partner.id,
        content,
        currentAttachment?.url,
        currentAttachment?.name,
        currentAttachment?.type
      );
      if (res && res.data) {

        setChatMessages(prev => [...prev, res.data]);
        chatMessagesLengthRef.current += 1;

        const convRes = await chatService.getConversations();
        if (convRes && convRes.data) {
          setConversations(convRes.data);
        }
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      setAttachedFile(currentAttachment);
      setChatInputText(content);
      alert("Không thể gửi tin nhắn. Vui lòng thử lại!");
    }
  };

  // Lấy lịch sử rút tiền
  const fetchWithdrawalHistory = async () => {
    try {
      const res = await vendorService.getWithdrawalHistory();
      if (res && res.data) {
        setWithdrawals(res.data);
      }
    } catch (err) {
      console.log("Lỗi tải lịch sử rút tiền:", err);
    }
  };

  // Gửi yêu cầu rút tiền
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ!");
      return;
    }

    if (amt < 100000) {
      alert("Số tiền rút tối thiểu là 100.000 VNĐ!");
      return;
    }
    if (amt > (stats.availableBalance || 0)) {
      alert("Số dư khả dụng không đủ để thực hiện giao dịch này!");
      return;
    }
    if (!withdrawForm.bankName || !withdrawForm.accountNumber || !withdrawForm.accountName) {

      alert("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng!");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Yêu cầu rút tiền",
      message: `Bạn có chắc chắn muốn gửi yêu cầu rút số tiền ${amt.toLocaleString()}₫ về tài khoản ngân hàng ${withdrawForm.bankName}?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.requestWithdrawal({
            amount: amt,
            bank_name: withdrawForm.bankName,
            account_number: withdrawForm.accountNumber,
            account_name: withdrawForm.accountName,
          });


          if (amt < 50000000) {
            alert("Rút tiền thành công!");
          } else {
            alert("Yêu cầu rút tiền từ 50.000.000 VNĐ trở lên đã được gửi và đang chờ Admin phê duyệt.");
          }

          setWithdrawForm(prev => ({ ...prev, amount: "" })); // Xoá trắng số tiền

          fetchWithdrawalHistory();

          // Load lại stats để cập nhật số dư khả dụng
          vendorService.getShopStatistics().then((res) => {
            if (res && res.data) {
              setStats(res.data);
            }
          });
        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || "Lỗi khi gửi yêu cầu rút tiền!");
        }
      },
    });
  };

  // Tạo mã giảm giá
  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: VoucherData = {
        code: voucherForm.code,
        description: voucherForm.description,
        discount_type: voucherForm.discount_type,
        discount_value: parseFloat(voucherForm.discount_value.toString()),
        min_order_amount: parseFloat(voucherForm.min_order_amount.toString()),
        max_discount: voucherForm.max_discount
          ? parseFloat(voucherForm.max_discount.toString())
          : undefined,
        usage_limit: voucherForm.usage_limit
          ? parseInt(voucherForm.usage_limit.toString())
          : undefined,
        per_user_limit: parseInt(voucherForm.per_user_limit.toString()),
        start_date: voucherForm.start_date || undefined,
        end_date: voucherForm.end_date || undefined,
        category_id: voucherForm.category_id ? parseInt(voucherForm.category_id.toString()) : undefined,
      };

      await vendorService.createVoucher(payload);
      alert("Tạo mã giảm giá thành công!");
      setShowVoucherModal(false);
      fetchShopVouchers();
    } catch (err) {
      console.error(err);
      alert("Lỗi tạo mã giảm giá!");
    }
  };

  const handleDeleteVoucher = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Hủy mã giảm giá",
      message: "Bạn có chắc chắn muốn hủy mã giảm giá này?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await vendorService.deleteVoucher(id);
          alert("Đã xóa mã giảm giá!");
          fetchShopVouchers();
        } catch (err) {
          console.error(err);
          alert("Lỗi hủy mã giảm giá!");
        }
      },
    });
  };

  // Cập nhật cấu hình Shop
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vendorService.updateMyShopInfo(settingsForm);
      if (res && res.data) {
        setShopInfo(res.data);
        alert("Cập nhật thông tin cửa hàng thành công!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi cập nhật thông tin cửa hàng!");
    }
  };

  const sidebarItems = [
    { id: "overview", label: "Tổng quan", icon: <LayoutDashboard size={20} /> },
    { id: "products", label: "Sản phẩm", icon: <Package size={20} /> },
    { id: "orders", label: "Đơn hàng", icon: <ShoppingCart size={20} /> },
    { id: "promos", label: "Khuyến mãi", icon: <Percent size={20} /> },
    { id: "finance", label: "Ví & Doanh thu", icon: <Wallet size={20} /> },
    { id: "chats", label: "Chat với khách", icon: <MessageCircle size={20} /> },
    {
      id: "interactions",
      label: "Bình luận & Đánh giá",
      icon: <MessageSquare size={20} />,
    },
    {
      id: "returns",
      label: "Trả hàng/Hoàn tiền",
      icon: <RefreshCcw size={20} />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center">
        <p className="text-xl font-black uppercase tracking-widest animate-pulse">
          Đang tải dữ liệu...
        </p>
      </div>
    );
  }

  // --- TRANG ĐĂNG KÝ SHOP REMOVED ---
  //   if (!isRegistered && !loading) {
  //     return (
  //       <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center p-6">
  //         <div className="text-center">
  //           <h2 className="text-2xl font-black uppercase text-red-500 mb-2">
  //             Lỗi truy cập
  //           </h2>
  //           <p className="text-gray-500">
  //             Bạn chưa có gian hàng. Vui lòng quay lại trang chủ.
  //           </p>
  // =======
  // --- TRANG CHỜ PHÊ DUYỆT ---
  if (shopInfo && shopInfo.status === "PENDING") {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-2 border-black rounded-[2rem] p-8 text-center shadow-brutal">
          <div className="w-16 h-16 bg-yellow-100 border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock className="text-yellow-600 animate-bounce" size={32} />
          </div>
          <h1 className="text-2xl font-serif font-black uppercase mb-4">Đang Chờ Phê Duyệt</h1>
          <p className="text-gray-600 font-medium mb-6">
            Yêu cầu đăng ký gian hàng <strong>"{shopInfo.shop_name || shopInfo.name}"</strong> của bạn đang được quản trị viên xét duyệt.
          </p>
          <p className="text-xs text-gray-500 mb-8 font-semibold">
            Chúng tôi sẽ thông báo cho bạn ngay sau khi gian hàng được phê duyệt hoạt động.
          </p>
          <Link to="/" className="w-full btn-brutal py-4 inline-block shadow-brutal hover:bg-primary transition-all text-xs font-bold uppercase">
            Quay lại Trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // --- TRANG BỊ TỪ CHỐI ---
  if (shopInfo && shopInfo.status === "REJECTED") {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-2 border-black rounded-[2rem] p-8 text-center shadow-brutal">
          <div className="w-16 h-16 bg-red-100 border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <X className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-serif font-black uppercase mb-4">Đơn Đăng Ký Bị Từ Chối</h1>
          <p className="text-gray-600 font-medium mb-4">
            Đơn đăng ký gian hàng <strong>"{shopInfo.shop_name || shopInfo.name}"</strong> của bạn đã bị từ chối.
          </p>
          {shopInfo.reject_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <span className="text-xs font-bold text-red-800 uppercase block mb-1">Lý do từ chối:</span>
              <p className="text-sm text-red-700 font-medium">{shopInfo.reject_reason}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                // Đưa về trạng thái chưa đăng ký để hiện lại form
                setRegisterForm({
                  name: shopInfo.shop_name || "",
                  phone: shopInfo.phone || "",
                  address: shopInfo.address || "",
                  industry: shopInfo.industry || "Thời trang Nam",
                  description: shopInfo.description || ""
                });
                setIsRegistered(false);
                setShopInfo(null);
              }}
              className="w-full btn-brutal py-4 shadow-brutal bg-primary text-xs font-bold uppercase hover:opacity-90 cursor-pointer"
            >
              Đăng ký lại
            </button>
            <Link to="/" className="w-full border-2 border-black rounded-xl py-4 font-bold hover:bg-gray-50 transition-colors text-xs font-bold uppercase">
              Quay lại Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- TRANG ĐĂNG KÝ SHOP ---
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-brutal">
              <Store size={32} />
            </div>
            <h1 className="text-4xl font-serif font-black tracking-tighter uppercase">Trở thành Người bán hàng</h1>
            <p className="text-gray-500 font-medium mt-2">Mở gian hàng của bạn trên UTEShop và bắt đầu kinh doanh ngay hôm nay</p>
          </div>

          <div className="bg-white border-2 border-black rounded-[2.5rem] p-10 shadow-brutal">
            <form className="space-y-8" onSubmit={handleRegisterShopSubmit}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tên gian hàng</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: UTEShop Official"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Số điện thoại kinh doanh</label>
                    <input
                      type="tel"
                      placeholder="0xxx xxx xxx"
                      className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <CustomSelect
                    label="Ngành hàng chính"
                    value={registerForm.industry}
                    options={[
                      { value: "Thời trang Nam", label: "Thời trang Nam" },
                      { value: "Thời trang Nữ", label: "Thời trang Nữ" },
                      { value: "Phụ kiện & Trang sức", label: "Phụ kiện & Trang sức" },
                      { value: "Giày dép", label: "Giày dép" }
                    ]}
                    onChange={(val) => setRegisterForm({ ...registerForm, industry: val })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Địa chỉ kho hàng (Lấy hàng)</label>
                  <textarea
                    rows={3}
                    placeholder="Số nhà, tên đường, phường/xã..."
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Mô tả shop (Giới thiệu ngắn gọn)</label>
                  <input
                    type="text"
                    placeholder="Giới thiệu phong cách sản phẩm của shop..."
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    value={registerForm.description}
                    onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-black text-primary focus:ring-primary" required />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                    Tôi đồng ý với các <span className="text-primary underline cursor-pointer">{"Điều khoản & Chính sách"}</span> dành cho Người bán của UTEShop.
                  </p>
                </div>
              </div>

              <button type="submit" className="w-full btn-brutal py-5 text-sm shadow-brutal hover:bg-primary transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                KHỞI TẠO GIAN HÀNG NGAY
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Lấy các hoạt động gần đây thật của shop từ đơn hàng và đánh giá
  const getRecentActivities = () => {
    const activities: Array<{ title: string; time: string; icon: any }> = [];

    // Thêm đơn hàng
    orders.forEach((order: any) => {
      if (order.status === "PENDING") {
        activities.push({
          title: `Đơn hàng mới #${order.order_code} chờ xác nhận`,
          time: order.created_at
            ? new Date(order.created_at).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "Vừa xong",
          icon: <Plus size={14} className="text-green-500" />,
        });
      } else if (order.status === "CONFIRMED" || order.status === "PREPARING") {
        activities.push({
          title: `Đơn hàng #${order.order_code} đang được xử lý`,
          time: order.created_at
            ? new Date(order.created_at).toLocaleDateString("vi-VN")
            : "Gần đây",
          icon: <Clock size={14} className="text-blue-500" />,
        });
      }
    });

    // Thêm đánh giá
    reviews.forEach((review: any) => {
      activities.push({
        title: `Đánh giá ${review.rating} sao từ ${review.user?.profile?.full_name || "khách hàng"}`,
        time: review.created_at
          ? new Date(review.created_at).toLocaleDateString("vi-VN")
          : "Gần đây",
        icon: <Star size={14} className="text-yellow-500 fill-yellow-500" />,
      });
    });

    if (activities.length === 0) {
      return [
        {
          title: "Hệ thống hoạt động bình thường",
          time: "Vừa xong",
          icon: <CheckCircle2 size={14} className="text-green-500" />,
        },
        {
          title: "Đang chờ đơn hàng và tương tác đầu tiên",
          time: "Hôm nay",
          icon: <Clock size={14} className="text-orange-500" />,
        },
      ];
    }

    return activities.slice(0, 4);
  };

  // Lấy danh sách khách hàng chat từ conversations thực tế
  const chatCustomers = conversations.map((c) => ({
    id: c.partner.id,
    name: c.partner.name,
    avatar: c.partner.avatar,
    role: c.partner.role,
    unreadCount: c.unreadCount,
    lastMessage: c.lastMessage,
  }));

  // Lấy giá trị lớn nhất trong stats để làm mốc biểu đồ
  const maxRevenue = Math.max(...stats.dailyRevenue, 1);

  // --- TRANG DASHBOARD CHÍNH ---
  return (
    <div className="min-h-screen bg-[#F4F4F0] flex overflow-hidden">
      {/* Sidebar - Reference from admin-dashboard layout but Neo-Brutalist style */}
      <aside className="w-64 bg-white border-r-2 border-black flex flex-col h-screen sticky top-0 z-50 shrink-0">
        <div className="p-8 border-b-2 border-black/5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-black text-white border-2 border-black rounded-xl flex items-center justify-center group-hover:bg-primary transition-all shadow-subtle group-hover:shadow-none">
              <ShoppingBag size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-black tracking-tighter uppercase leading-none">
                UTEShop
              </span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">
                VENDOR
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? "bg-black text-white shadow-brutal translate-x-1" : "hover:bg-primary/10 text-gray-400 hover:text-black"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col h-screen overflow-y-auto relative">
        {/* Topbar (AppHeader style) */}
        <header className="bg-white/80 backdrop-blur-md border-b border-black/5 h-20 px-10 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="relative w-96 my-4">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full bg-gray-50 border-2 border-black rounded-xl px-12 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black uppercase text-gray-500">
                {shopInfo?.name}
              </span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                {shopInfo?.industry}
              </span>
            </div>

            <NotificationDropdown />

            <div className="w-[2px] h-8 bg-gray-100"></div>

            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="w-11 h-11 bg-primary/10 border-2 border-black rounded-xl flex items-center justify-center text-primary hover:bg-primary/20 transition-all active:translate-y-1 overflow-hidden shadow-sm"
              >
                {shopInfo?.avatar_url || shopInfo?.shop_logo ? (
                  <img
                    src={shopInfo.avatar_url || shopInfo.shop_logo}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={DEFAULT_SHOP_LOGO}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                )}
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-4 w-64 bg-white border-2 border-black rounded-2xl shadow-brutal z-50 p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black overflow-hidden border border-black/10">
                      {shopInfo?.avatar_url || shopInfo?.shop_logo ? (
                        <img
                          src={shopInfo.avatar_url || shopInfo.shop_logo}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={DEFAULT_SHOP_LOGO}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase">
                        {shopInfo?.shop_name || shopInfo?.name}
                      </p>
                      <p className="text-[10px] text-primary font-bold">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Thông tin cửa hàng
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all mt-2"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/"
              className="flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-black text-white hover:bg-primary transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Website <ExternalLink size={14} />
            </Link>

            <button className="flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-black hover:bg-green-500 hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
              Báo cáo <FileDown size={14} />
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-10 max-w-7xl w-full mx-auto">
          {/* TAB: TỔNG QUAN (Overview) */}
          {activeTab === "overview" && (
            <div className="space-y-10">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-serif font-black tracking-tighter uppercase mb-2">
                    Thống kê cửa hàng
                  </h1>
                  <p className="text-gray-500 font-medium italic">
                    Tổng hợp tình hình kinh doanh của shop trong ngày.
                  </p>
                </div>
              </div>

              {/* Bento Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    label: "Doanh thu",
                    value: `${stats.revenue.toLocaleString()}₫`,
                    sub: "Hôm nay",
                    icon: <Wallet className="text-green-500" />,
                  },
                  {
                    label: "Đơn hàng",
                    value: stats.ordersCount.toString(),
                    sub: "Hôm nay",
                    icon: <ShoppingBag className="text-blue-500" />,
                  },
                  {
                    label: "Sản phẩm đang bán",
                    value: stats.productsCount.toString(),
                    sub: "Hoạt động",
                    icon: <Package className="text-orange-500" />,
                  },
                  {
                    label: "Bình luận & Đánh giá",
                    value: stats.commentsCount.toString(),
                    sub: "Tất cả",
                    icon: <MessageSquare className="text-red-500" />,
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-black/5">
                        {stat.icon}
                      </div>
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        {stat.sub}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-black tracking-tighter mt-1">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Mockup */}
                <div className="lg:col-span-2 bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                    <TrendingUp className="text-primary" /> Doanh thu 7 ngày qua
                    (₫)
                  </h3>
                  <div className="h-64 flex items-end justify-between gap-3 px-4">
                    {stats.dailyRevenue.map((val, i) => {
                      const heightPercentage = Math.round(
                        (val / maxRevenue) * 100,
                      );
                      return (
                        <div
                          key={i}
                          className="flex-grow bg-black rounded-t-xl hover:bg-primary transition-all relative group cursor-pointer"
                          style={{
                            height: `${Math.max(heightPercentage, 5)}%`,
                          }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">
                            {val.toLocaleString()}₫
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6">
                    Hoạt động gần đây
                  </h3>
                  <div className="space-y-6">
                    {getRecentActivities().map((item, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="mt-1">{item.icon}</div>
                        <div>
                          <p className="text-xs font-black uppercase leading-tight">
                            {item.title}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SẢN PHẨM (Products) */}
          {activeTab === "products" && (
            <div className="space-y-8">
              {productView === "list" ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-serif font-black uppercase">
                      Quản lý Sản phẩm
                    </h2>
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({
                          name: "",
                          category_id: categories[0]?.id?.toString() || "",
                          brand_id: "",
                          description: "",
                          price: 0,
                          sale_price: "",
                          gender: "UNISEX",
                          material: "",
                          stock_quantity: 10,
                          image_url: "",

                          is_new: false,
                          is_featured: false

                        });
                        setGalleryImages([]);
                        setPrimaryImageUrl("");
                        setHasVariants(false);
                        setProductVariants([]);
                        setBulkSizes("");
                        setBulkColors("");
                        setBulkPrice("");
                        setBulkSalePrice("");
                        setBulkStock("");
                        setProductImageType("url");
                        setProductView("add");
                      }}
                      className="px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-black text-white hover:bg-primary transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2"
                    >
                      <Plus size={16} /> THÊM SẢN PHẨM
                    </button>
                  </div>

                  <div className="bg-white border-2 border-black rounded-[2rem] overflow-hidden shadow-sm">
                    <div className="p-6 border-b-2 border-black/5 bg-gray-50/50 flex flex-col gap-4">
                      <div className="relative flex-grow">
                        <input
                          type="text"
                          placeholder="Tìm tên sản phẩm..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          className="w-full bg-white border-2 border-black rounded-xl px-10 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={16}
                        />
                      </div>
                      
                      {/* Bộ lọc trạng thái sản phẩm */}
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {[
                          "ALL",
                          "APPROVED",
                          "PENDING",
                          "REJECTED",
                          "HIDDEN",
                        ].map((status) => (
                          <button
                            key={status}
                            onClick={() => setProductStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${productStatusFilter === status ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black"}`}
                          >
                            {status === "ALL"
                              ? "Tất cả"
                              : status === "APPROVED"
                                ? "Đang bán"
                                : status === "PENDING"
                                  ? "Chờ duyệt"
                                  : status === "REJECTED"
                                    ? "Bị từ chối"
                                    : "Ngừng bán"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b-2 border-black/5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/30">
                            <th className="px-8 py-4">Sản phẩm</th>
                            <th className="px-8 py-4">Mã SKU</th>
                            <th className="px-8 py-4">Giá bán</th>
                            <th className="px-8 py-4">Tồn kho</th>
                            <th className="px-8 py-4">Trạng thái</th>
                            <th className="px-8 py-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black/5">
                          {products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) && (productStatusFilter === "ALL" || p.approval_status === productStatusFilter)).length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-8 py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest"
                              >
                                Không có sản phẩm nào
                              </td>
                            </tr>
                          ) : (
                            products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) && (productStatusFilter === "ALL" || p.approval_status === productStatusFilter)).map((prod, i) => (
                              <tr
                                key={prod.id || i}
                                className="hover:bg-gray-50 transition-colors group"
                              >
                                <td className="px-8 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-12 bg-gray-100 rounded-lg border border-black/5 overflow-hidden shrink-0">
                                      <img
                                        src={
                                          prod.images && prod.images[0]
                                            ? prod.images[0].image_url
                                            : "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=100"
                                        }
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <span className="text-xs font-black uppercase truncate max-w-[200px]">
                                      {prod.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-8 py-4 text-xs font-mono font-bold text-gray-400">
                                  {prod.variants && prod.variants[0]
                                    ? prod.variants[0].sku
                                    : `PROD-00${prod.id}`}
                                </td>
                                <td className="px-8 py-4 text-xs font-black">
                                  {prod.price.toLocaleString()}₫
                                </td>
                                <td className="px-8 py-4 text-xs font-black text-primary">
                                  {prod.stock_quantity ||
                                    (prod.variants &&
                                      prod.variants.reduce(
                                        (sum: number, v: any) =>
                                          sum + v.stock_quantity,
                                        0,
                                      )) ||
                                    0}
                                </td>
                                <td className="px-8 py-4">



                                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${prod.approval_status === 'APPROVED'
                                    ? 'bg-green-50 text-green-600 border-green-100'
                                    : prod.approval_status === 'PENDING'
                                      ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                      : prod.approval_status === 'REJECTED'
                                        ? 'bg-red-50 text-red-600 border-red-100'
                                        : 'bg-gray-50 text-gray-600 border-gray-100'
                                    }`}>
                                    {prod.approval_status === 'APPROVED'
                                      ? 'Đang bán'
                                      : prod.approval_status === 'PENDING'
                                        ? 'Chờ duyệt'
                                        : prod.approval_status === 'REJECTED'
                                          ? 'Bị từ chối'
                                          : 'Ngừng bán'}

                                  </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                  <div className="flex justify-end gap-2">



                                    <button onClick={() => startEditProduct(prod)} className="p-2 border-2 border-black rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"><Edit3 size={14} /></button>
                                    {(prod.approval_status === 'APPROVED' || prod.approval_status === 'HIDDEN') && (
                                      <button 
                                        onClick={() => handleToggleProductStatus(prod.id, prod.approval_status)} 
                                        title={prod.approval_status === 'APPROVED' ? "Ngừng bán" : "Bán trở lại"}
                                        className={`p-2 border-2 border-black rounded-lg transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                                          prod.approval_status === 'APPROVED' 
                                            ? "text-red-600 hover:bg-red-600 hover:text-white" 
                                            : "text-green-600 hover:bg-green-600 hover:text-white"
                                        }`}
                                      >
                                        {prod.approval_status === 'APPROVED' ? <EyeOff size={14} /> : <Eye size={14} />}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* GIAO DIỆN FORM SUB-VIEW TOÀN TRANG */
                <div className="bg-white border-2 border-black rounded-[2.5rem] p-10 shadow-sm space-y-8 animate-in fade-in duration-200">
                  <div className="flex items-center gap-4 border-b-2 border-black/5 pb-6">
                    <button
                      onClick={() => setProductView("list")}
                      className="p-3 border-2 border-black rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center shadow-subtle active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Quay lại danh sách
                      </span>
                      <h2 className="text-2xl font-serif font-black uppercase tracking-tight">
                        {productView === "add"
                          ? "Thêm sản phẩm mới"
                          : "Cập nhật thông tin sản phẩm"}
                      </h2>
                    </div>
                  </div>

                  <form onSubmit={handleProductSubmit} className="space-y-8">
                    {/* Phần 1: Thông tin chung */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-primary border-l-4 border-primary pl-2">
                        1. Thông tin chung
                      </h3>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Tên sản phẩm
                        </label>
                        <input
                          type="text"
                          className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3.5 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                          value={productForm.name}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              name: e.target.value,
                            })
                          }
                          required
                          placeholder="Ví dụ: Áo thun Oversize Heritage UTEShop"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CustomSelect
                          label="Danh mục"
                          value={productForm.category_id}
                          placeholder="-- Chọn danh mục --"
                          options={categories.map((cat: any) => ({
                            value: cat.id,
                            label: cat.name,
                          }))}
                          onChange={(val) =>
                            setProductForm({ ...productForm, category_id: val })
                          }
                        />
                        <CustomSelect
                          label="Phù hợp với giới tính"
                          value={productForm.gender}
                          placeholder="-- Chọn giới tính --"
                          options={[
                            { value: "MALE", label: "Nam" },
                            { value: "FEMALE", label: "Nữ" },
                            { value: "UNISEX", label: "Unisex (Cả nam và nữ)" },
                          ]}
                          onChange={(val) =>
                            setProductForm({ ...productForm, gender: val })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Chất liệu sản phẩm
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 100% Cotton, Vải thô, Linen..."
                            className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3.5 font-bold focus:outline-none"
                            value={productForm.material}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                material: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Ảnh sản phẩm
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setProductImageType("url")}
                                className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-black rounded-lg transition-all ${productImageType === "url" ? "bg-black text-white shadow-sm" : "bg-white text-black hover:bg-gray-50 active:translate-y-[1px]"}`}
                              >
                                Sử dụng URL
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductImageType("file")}
                                className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-black rounded-lg transition-all ${productImageType === "file" ? "bg-black text-white shadow-sm" : "bg-white text-black hover:bg-gray-50 active:translate-y-[1px]"}`}
                              >
                                Tải ảnh từ máy
                              </button>
                            </div>
                          </div>

                          {productImageType === "url" ? (

                            // <input
                            //   type="text"
                            //   placeholder="https://images.unsplash.com/..."
                            //   className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3.5 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10"
                            //   value={productForm.image_url}
                            //   onChange={(e) =>
                            //     setProductForm({
                            //       ...productForm,
                            //       image_url: e.target.value,
                            //     })
                            //   }
                            // />

                            <div className="flex gap-3">
                              <input
                                type="text"
                                placeholder="Nhập link ảnh (https://...)"
                                className="flex-grow bg-gray-50 border-2 border-black rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/10"
                                id="product-image-url-input"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById("product-image-url-input") as HTMLInputElement;
                                  const url = input?.value?.trim();
                                  if (!url) {
                                    alert("Vui lòng nhập đường dẫn ảnh!");
                                    return;
                                  }
                                  if (galleryImages.length >= 5) {
                                    alert("Bạn chỉ được thêm tối đa 5 ảnh chính!");
                                    return;
                                  }
                                  if (galleryImages.length === 0) {
                                    setGalleryImages([url]);
                                    setPrimaryImageUrl(url);
                                    setProductForm(prev => ({ ...prev, image_url: url }));
                                  } else {
                                    setGalleryImages(prev => [...prev, url]);
                                    setPendingImageUrl(url);
                                    setShowPrimaryConfirm(true);
                                  }
                                  if (input) input.value = "";
                                }}
                                className="px-4 py-3 border-2 border-black bg-black text-white rounded-xl text-xs font-black hover:bg-primary transition-all active:translate-y-[1px]"
                              >
                                THÊM
                              </button>
                            </div>

                          ) : (
                            <div className="flex items-center gap-3">
                              <label className="flex-grow flex items-center justify-center border-2 border-dashed border-black rounded-xl py-3 px-4 bg-gray-50 hover:bg-gray-100/50 cursor-pointer transition-colors relative active:translate-y-[1px]">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleProductImageUpload}
                                  disabled={isUploadingProductImage || galleryImages.length >= 5}
                                  id="product-image-file"
                                />
                                <span className="text-xs font-bold text-gray-600">



                                  {isUploadingProductImage ? "Đang tải ảnh lên..." : galleryImages.length >= 5 ? "Đã đạt giới hạn 5 ảnh" : "Chọn ảnh từ thiết bị của bạn"}
                                </span>
                              </label>
                            </div>
                          )}

                          {/* Lưới quản lý 5 ảnh Gallery */}
                          {galleryImages.length > 0 && (
                            <div className="mt-4 p-4 bg-gray-50 border-2 border-black rounded-[1.5rem] space-y-3">
                              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">
                                Thư viện ảnh sản phẩm ({galleryImages.length}/5) - Click chọn làm ảnh chính
                              </label>
                              <div className="grid grid-cols-5 gap-3">
                                {galleryImages.map((url, idx) => {
                                  const isPrimary = url === primaryImageUrl;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setPrimaryImageUrl(url);
                                        setProductForm(prev => ({ ...prev, image_url: url }));
                                      }}
                                      className={`aspect-[4/5] rounded-xl overflow-hidden border-2 cursor-pointer transition-all relative ${isPrimary ? "border-primary border-[3px] shadow-sm translate-y-[-2px]" : "border-black hover:border-primary"}`}
                                    >
                                      <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                      {isPrimary ? (
                                        <div className="absolute bottom-1 left-1 right-1 bg-primary text-white border border-black rounded text-[7px] font-black uppercase tracking-tight text-center py-0.5">
                                          ★ CHÍNH
                                        </div>
                                      ) : (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[8px] font-bold text-center">
                                          CHỌN CHÍNH
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const updated = galleryImages.filter((_, i) => i !== idx);
                                          setGalleryImages(updated);
                                          if (isPrimary) {
                                            const newPrimary = updated[0] || "";
                                            setPrimaryImageUrl(newPrimary);
                                            setProductForm(prev => ({ ...prev, image_url: newPrimary }));
                                          }
                                        }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white border border-black rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                        title="Xóa ảnh"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Mô tả chi tiết sản phẩm
                        </label>
                        <textarea
                          rows={4}
                          className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3.5 font-bold resize-none focus:outline-none"
                          value={productForm.description}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Mô tả kiểu dáng, số đo mẫu, cách bảo quản..."
                        ></textarea>
                      </div>

                      {/* Phân loại Hàng mới / Hàng nổi bật */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 border-2 border-black rounded-[1.5rem] p-6 mt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black uppercase text-black">Hàng Mới Về</span>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Đánh dấu sản phẩm mới trong gian hàng</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={productForm.is_new}
                              onChange={(e) => setProductForm({ ...productForm, is_new: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-black border-2 border-black"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black uppercase text-black">Hàng Nổi Bật</span>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Hiển thị sản phẩm ở mục nổi bật trang chủ</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={productForm.is_featured}
                              onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-black border-2 border-black"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Phần 2: Cài đặt biến thể & Phân loại */}
                    <div className="space-y-6 pt-4 border-t border-black/5">
                      <div className="flex items-center justify-between">
                        <div>

                          <h3 className="text-sm font-black uppercase tracking-widest text-primary border-l-4 border-primary pl-2">
                            2. Cấu hình phân loại & biến thể
                          </h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                            Bật chế độ này nếu sản phẩm của bạn có nhiều kích cỡ
                            hoặc màu sắc khác nhau
                          </p>

                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-black uppercase ${hasVariants ? "text-primary" : "text-gray-400"}`}
                          >
                            Có nhiều biến thể
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={hasVariants}
                              onChange={(e) => setHasVariants(e.target.checked)}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-black border-2 border-black"></div>
                          </label>
                        </div>
                      </div>

                      {!hasVariants ? (
                        /* CHẾ ĐỘ SẢN PHẨM ĐƠN BIẾN THỂ */
                        <div className="bg-gray-50 border-2 border-black rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Giá bán cơ bản (₫)
                            </label>
                            <input
                              type="number"
                              className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 font-bold focus:outline-none"
                              value={productForm.price}
                              onChange={(e) =>
                                setProductForm({
                                  ...productForm,
                                  price: parseFloat(e.target.value || "0"),
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Giá khuyến mãi (₫ - Nếu có)
                            </label>
                            <input
                              type="number"
                              className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 font-bold focus:outline-none"
                              value={productForm.sale_price}
                              onChange={(e) =>
                                setProductForm({
                                  ...productForm,
                                  sale_price: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Số lượng tồn kho chung
                            </label>
                            <input
                              type="number"
                              className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 font-bold focus:outline-none"
                              value={productForm.stock_quantity}
                              onChange={(e) =>
                                setProductForm({
                                  ...productForm,
                                  stock_quantity: parseInt(
                                    e.target.value || "0",
                                  ),
                                })
                              }
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        /* CHẾ ĐỘ SẢN PHẨM ĐA BIẾN THỂ */
                        <div className="space-y-8 animate-in fade-in duration-200">
                          {/* 2.1: Nhập và tạo nhanh biến thể (Bulk Operations) */}
                          <div className="bg-[#FAF9F6] border-2 border-dashed border-black rounded-[2rem] p-8 space-y-6">
                            <div className="flex items-center gap-2">
                              <Store size={18} className="text-primary" />
                              <h4 className="text-xs font-black uppercase tracking-wider">{"Bảng điều khiển & Tạo biến thể nhanh"}</h4>
                            </div>

                            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-[11px] font-bold text-blue-700 space-y-1">
                              <p className="flex items-center gap-1.5 font-black uppercase">
                                <span>💡 LƯU Ý VỀ TẠO BIẾN THỂ</span>
                              </p>
                              <p>• Khi bạn nhập kích thước/màu sắc mới và nhấn <strong>"Tự động sinh"</strong>, hệ thống sẽ chỉ thêm các biến thể mới mà <strong>KHÔNG</strong> làm mất hay đè lên dữ liệu của các biến thể đã có sẵn ở danh sách bên dưới.</p>
                              <p>• Bạn có thể thoải mái thêm mới kích thước, màu sắc khác. Nếu muốn xóa bỏ phân loại cũ, hãy click vào nút <strong>Xóa (icon dấu x)</strong> ở cột Hành động của biến thể đó trong bảng danh sách bên dưới.</p>

                            </div>

                            {/* Dòng 1: Tạo tổ hợp biến thể */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border-2 border-black rounded-2xl p-6 shadow-sm">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Kích thước (cách nhau bởi dấu phẩy)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ví dụ: S, M, L, XL"
                                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                  value={bulkSizes}
                                  onChange={(e) => setBulkSizes(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Màu sắc (cách nhau bởi dấu phẩy)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ví dụ: Đen, Trắng, Xanh Navy"
                                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                  value={bulkColors}
                                  onChange={(e) =>
                                    setBulkColors(e.target.value)
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                onClick={generateBulkVariants}
                                className="md:col-span-2 py-3 bg-black text-white hover:bg-primary font-black text-[10px] uppercase tracking-widest rounded-xl border-2 border-black transition-all active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                              >
                                Tự động sinh danh sách biến thể
                              </button>
                            </div>

                            {/* Dòng 2: Thiết lập nhanh giá & tồn kho */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border-2 border-black rounded-2xl p-6 shadow-sm items-end">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Giá gốc chung (₫)
                                </label>
                                <input
                                  type="number"
                                  placeholder="Ví dụ: 199000"
                                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                  value={bulkPrice}
                                  onChange={(e) => setBulkPrice(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Giá khuyến mãi chung (₫)
                                </label>
                                <input
                                  type="number"
                                  placeholder="Ví dụ: 159000"
                                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                  value={bulkSalePrice}
                                  onChange={(e) =>
                                    setBulkSalePrice(e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Số lượng tồn kho áp dụng chung
                                </label>
                                <input
                                  type="number"
                                  placeholder="Ví dụ: 20"
                                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                                  value={bulkStock}
                                  onChange={(e) => setBulkStock(e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={applyBulkSettings}
                                className="py-2.5 bg-green-500 text-white hover:bg-green-600 font-black text-[10px] uppercase tracking-widest rounded-xl border-2 border-black transition-all active:translate-y-[2px] active:translate-x-[2px] active:shadow-none shadow-subtle"
                              >
                                Áp dụng cho toàn bộ biến thể
                              </button>
                            </div>
                          </div>

                          {/* 2.2: Bảng chi tiết biến thể */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                                Danh sách các biến thể đang có (
                                {productVariants.length})
                              </h4>
                              <button
                                type="button"
                                onClick={addSingleVariant}
                                className="px-4 py-2 border-2 border-black rounded-lg font-black text-[9px] uppercase tracking-widest bg-white text-black hover:bg-gray-100 transition-all flex items-center gap-1.5 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                              >
                                <Plus size={12} /> Thêm biến thể đơn lẻ
                              </button>
                            </div>

                            <div className="border-2 border-black rounded-2xl overflow-hidden bg-white shadow-sm">
                              <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b-2 border-black/5 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50 sticky top-0 z-10">

                                      <th className="px-6 py-3">Kích thước (Size)</th>
                                      <th className="px-6 py-3">{"Màu sắc (Color & Hex)"}</th>
                                      <th className="px-6 py-3">Ảnh biến thể</th>
                                      <th className="px-6 py-3">Giá gốc riêng (₫)</th>
                                      <th className="px-6 py-3">Giá khuyến mãi riêng (₫)</th>

                                      <th className="px-6 py-3">% Giảm</th>
                                      <th className="px-6 py-3">Tồn kho</th>
                                      <th className="px-6 py-3 text-right">
                                        Hành động
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/5">
                                    {productVariants.length === 0 ? (
                                      <tr>

                                        <td colSpan={8} className="px-6 py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                          Chưa có biến thể nào được tạo. Hãy sử dụng bảng tạo nhanh ở trên hoặc bấm thêm biến thể đơn lẻ!

                                        </td>
                                      </tr>
                                    ) : (
                                      productVariants.map((v, idx) => {
                                        const priceNum = parseFloat(
                                          v.price?.toString() || "0",
                                        );
                                        const salePriceNum = parseFloat(
                                          v.sale_price?.toString() || "0",
                                        );
                                        const discountPercent =
                                          priceNum &&
                                            salePriceNum &&
                                            priceNum > salePriceNum
                                            ? Math.round(
                                              ((priceNum - salePriceNum) /
                                                priceNum) *
                                              100,
                                            )
                                            : 0;

                                        return (
                                          <tr
                                            key={idx}
                                            className="hover:bg-gray-50/50"
                                          >
                                            <td className="px-6 py-3">
                                              <input
                                                type="text"
                                                className="w-24 bg-gray-50 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none"
                                                value={v.size}
                                                onChange={(e) =>
                                                  updateVariantField(
                                                    idx,
                                                    "size",
                                                    e.target.value,
                                                  )
                                                }
                                                required
                                              />
                                            </td>
                                            <td className="px-6 py-3">


                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="text"
                                                  className="w-24 bg-gray-50 border-2 border-black rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none"
                                                  value={v.color}
                                                  onChange={(e) => updateVariantField(idx, "color", e.target.value)}
                                                  required
                                                />
                                                <input
                                                  type="color"
                                                  className="w-7 h-7 border border-black rounded cursor-pointer p-0 bg-transparent shrink-0"
                                                  value={v.color_hex || "#888888"}
                                                  onChange={(e) => updateVariantField(idx, "color_hex", e.target.value)}
                                                  title="Chọn mã màu"
                                                />
                                              </div>
                                            </td>
                                            <td className="px-6 py-3">
                                              <div className="flex items-center gap-2 min-w-[170px]">
                                                {v.image_url ? (
                                                  <div className="w-8 h-8 rounded border border-black overflow-hidden bg-gray-50 shrink-0 relative group">
                                                    <img
                                                      src={v.image_url.startsWith('http') || v.image_url.startsWith('data:') ? v.image_url : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${v.image_url.startsWith('/') ? '' : '/'}${v.image_url}`}
                                                      alt="variant"
                                                      className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => updateVariantField(idx, "image_url", "")}
                                                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                      title="Xóa ảnh"
                                                    >
                                                      <X size={12} />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <div className="w-8 h-8 rounded border-2 border-dashed border-black bg-gray-50 shrink-0" />
                                                )}

                                                <input
                                                  type="text"
                                                  placeholder="URL ảnh"
                                                  className="flex-grow bg-gray-50 border border-black rounded px-1.5 py-1 text-[10px] font-bold focus:outline-none min-w-[80px]"
                                                  value={v.image_url || ""}
                                                  onChange={(e) => updateVariantField(idx, "image_url", e.target.value)}
                                                />

                                                <label className="shrink-0 cursor-pointer bg-black text-white px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded border border-black hover:bg-primary transition-all active:scale-95">
                                                  Chọn
                                                  <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleVariantImageUpload(idx, e)}
                                                  />
                                                </label>
                                              </div>

                                            </td>
                                            <td className="px-6 py-3">
                                              <input
                                                type="number"
                                                className="w-28 bg-gray-50 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none"
                                                value={v.price}
                                                onChange={(e) =>
                                                  updateVariantField(
                                                    idx,
                                                    "price",
                                                    parseFloat(
                                                      e.target.value || "0",
                                                    ),
                                                  )
                                                }
                                                required
                                              />
                                            </td>
                                            <td className="px-6 py-3">
                                              <input
                                                type="number"
                                                className="w-28 bg-gray-50 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none"
                                                value={v.sale_price}

                                                onChange={(e) => updateVariantField(idx, "sale_price", e.target.value)}
                                                placeholder="Nếu có giảm giá"

                                              />
                                            </td>
                                            <td className="px-6 py-3 text-xs font-black text-red-600">
                                              {discountPercent > 0
                                                ? `${discountPercent}%`
                                                : "-"}
                                            </td>
                                            <td className="px-6 py-3">
                                              <input
                                                type="number"
                                                className="w-24 bg-gray-50 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none"
                                                value={v.stock_quantity}
                                                onChange={(e) =>
                                                  updateVariantField(
                                                    idx,
                                                    "stock_quantity",
                                                    parseInt(
                                                      e.target.value || "0",
                                                    ),
                                                  )
                                                }
                                                required
                                              />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeVariant(idx)
                                                }
                                                className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                              >
                                                <X size={14} />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nút bấm Submit */}
                    <div className="pt-6 border-t border-black/5 flex gap-4">
                      <button
                        type="button"
                        onClick={() => setProductView("list")}
                        className="flex-1 py-4 border-2 border-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-4 bg-black text-white hover:bg-primary border-2 border-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-brutal active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                      >
                        {productView === "add"
                          ? "Tạo sản phẩm mới"
                          : "Cập nhật sản phẩm"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB: TRẢ HÀNG/HOÀN TIỀN (Returns) */}
          {activeTab === "returns" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif font-black uppercase">
                  Quản lý Trả hàng
                </h2>
              </div>
              <div className="bg-white border-2 border-black rounded-3xl p-6 md:p-8 shadow-brutal mt-8">
                {returnRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <RefreshCcw
                      size={48}
                      className="mx-auto text-gray-300 mb-4"
                    />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                      Chưa có yêu cầu trả hàng nào
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {returnRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-6 border-2 border-black rounded-2xl hover:shadow-subtle transition-all bg-white flex flex-col gap-4"
                      >
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-black uppercase bg-black text-white px-3 py-1 rounded-md">
                                Đơn hàng #{req.shop_order_id || req.shopOrder?.shop_order_code}
                              </span>
                              <span
                                className={`text-xs font-black uppercase px-3 py-1 rounded-md border-2 ${req.status === "PENDING" ? "bg-orange-100 text-orange-600 border-orange-200" : req.status === "APPROVED_BY_SHOP" || req.status === "RESOLVED_BY_ADMIN" || req.status === "COMPLETED" ? "bg-green-100 text-green-600 border-green-200" : "bg-red-100 text-red-600 border-red-200"}`}
                              >
                                {req.status}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-gray-600">
                              Lý do: {req.reason}
                            </p>
                            <p className="text-sm font-medium text-gray-500 mt-1">
                              Số tiền hoàn:{" "}
                              {Number(
                                req.items?.reduce(
                                  (sum: number, item: any) =>
                                    sum +
                                    item.quantity *
                                    (item.orderItem?.unit_price || 0),
                                  0,
                                ) || 0,
                              ).toLocaleString()}
                              ₫
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {req.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleOpenRejectModal(req.id)}
                                  className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all active:translate-y-1"
                                >
                                  Từ chối
                                </button>
                                <button
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        "Bạn có chắc muốn chấp nhận yêu cầu này? Tiền sẽ được hoàn cho khách.",
                                      )
                                    ) {
                                      try {
                                        await vendorService.approveReturnRequest(
                                          req.id,
                                        );
                                        alert(
                                          "Đã chấp nhận trả hàng. Tiền đã được hoàn.",
                                        );
                                        fetchShopReturns();
                                      } catch (err: any) {
                                        alert(
                                          err.response?.data?.message || "Lỗi",
                                        );
                                      }
                                    }
                                  }}
                                  className="px-4 py-2 border-2 border-black bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                >
                                  Chấp nhận
                                </button>
                              </>
                            )}
                            {req.status === "REJECTED" && (
                              <p className="text-xs text-red-500 font-bold italic">
                                Khách có thể khiếu nại lên admin
                              </p>
                            )}
                            {req.status === "DISPUTED" && (
                              <p className="text-xs text-orange-500 font-bold italic">
                                Đang được Quản lý xử lý
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2">
                          <p className="text-[10px] font-black uppercase text-gray-400 mb-3">
                            Sản phẩm trả lại
                          </p>
                          <div className="space-y-3">
                            {req.items?.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
                              >
                                {item.orderItem?.variant?.product?.images?.[0]?.image_url ? (
                                  <img
                                    src={item.orderItem.variant.product.images[0].image_url}
                                    alt={item.orderItem.product_name}
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <Package size={24} className="text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-bold">
                                    {item.orderItem?.product_name || "Sản phẩm"}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.orderItem?.size} | {item.orderItem?.color} {item.orderItem?.sku ? `| SKU: ${item.orderItem.sku}` : ''}
                                  </p>
                                  <p className="text-xs font-black mt-1">
                                    Số lượng: {item.quantity}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-[10px] font-black uppercase text-gray-400 mb-3 mt-3">
                            Ảnh minh chứng từ khách
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              try {
                                const urls = req.evidence_urls ? JSON.parse(req.evidence_urls) : [];
                                return urls.length > 0 ? urls.map((url: string, idx: number) => (
                                  <a href={url} target="_blank" rel="noreferrer" key={idx}>
                                    <img src={url} alt="Minh chứng" className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                                  </a>
                                )) : <p className="text-xs text-gray-500 italic">Không có ảnh đính kèm</p>;
                              } catch (e) {
                                return req.evidence_urls ? (
                                  <a href={req.evidence_urls} target="_blank" rel="noreferrer" className="text-blue-500 text-xs underline">
                                    Xem minh chứng
                                  </a>
                                ) : <p className="text-xs text-gray-500 italic">Không có ảnh đính kèm</p>;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ĐƠN HÀNG (Orders) */}
          {activeTab === "orders" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif font-black uppercase">
                  Quản lý Đơn hàng
                </h2>

                {/* Nút thao tác hàng loạt */}
                {(filterStatus === "PENDING" ||
                  filterStatus === "CONFIRMED" ||
                  filterStatus === "PREPARING") && (
                    <button
                      onClick={() => handleBulkUpdate(filterStatus)}
                      className="flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest bg-black text-white hover:bg-primary transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      <CheckCircle2 size={16} />
                      {filterStatus === "PENDING"
                        ? "XÁC NHẬN TẤT CẢ"
                        : filterStatus === "CONFIRMED"
                          ? "CHUẨN BỊ TẤT CẢ"
                          : "GIAO TẤT CẢ"}
                    </button>
                  )}
              </div>

              {/* Bộ lọc trạng thái */}
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {[
                  "ALL",
                  "PENDING",
                  "CONFIRMED",
                  "PREPARING",
                  "SHIPPING",
                  "DELIVERED",
                  "CANCELLED",
                ].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${filterStatus === status ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black"}`}
                  >
                    {status === "ALL"
                      ? "Tất cả"
                      : status === "PENDING"
                        ? "Đang chờ"
                        : status === "CONFIRMED"
                          ? "Đã xác nhận"
                          : status === "PREPARING"
                            ? "Đang chuẩn bị"
                            : status === "SHIPPING"
                              ? "Đang giao hàng"
                              : status === "DELIVERED"
                                ? "Hoàn tất"
                                : "Đã hủy"}
                  </button>
                ))}
              </div>

              <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-2 border-black/5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/30">
                        <th className="px-8 py-4">Mã đơn hàng</th>
                        <th className="px-8 py-4">Khách hàng</th>
                        <th className="px-8 py-4">Chi tiết sản phẩm</th>
                        <th className="px-8 py-4">Tổng tiền nhận</th>
                        <th className="px-8 py-4">Trạng thái</th>
                        <th className="px-8 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/5">
                      {orders.filter((o: any) => {
                        if (filterStatus === "ALL") return true;
                        if (filterStatus === "DELIVERED") return ["DELIVERED", "COMPLETED"].includes(o.status);
                        if (filterStatus === "SHIPPING") return ["READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "DELIVERING", "SHIPPING"].includes(o.status);
                        return o.status === filterStatus;
                      }).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-8 py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest"
                          >
                            Không có đơn hàng nào
                          </td>
                        </tr>
                      ) : (
                        orders
                          .filter((o: any) => {
                            if (filterStatus === "ALL") return true;
                            if (filterStatus === "DELIVERED") return ["DELIVERED", "COMPLETED"].includes(o.status);
                            if (filterStatus === "SHIPPING") return ["READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "DELIVERING", "SHIPPING"].includes(o.status);
                            return o.status === filterStatus;
                          })
                          .map((order, i) => {
                            let customerName = "Khách hàng";
                            let customerContact = "";

                            if (order.parentOrder?.shipping_address) {
                              try {
                                const addr = JSON.parse(
                                  order.parentOrder.shipping_address,
                                );
                                customerName =
                                  addr.receiver_name || customerName;
                                customerContact =
                                  addr.phone_number || customerContact;
                              } catch (e) {
                                // Ignore parse error
                              }
                            }

                            if (!customerContact && order.parentOrder?.user) {
                              customerName =
                                order.parentOrder.user.profile?.full_name ||
                                customerName;
                              customerContact =
                                order.parentOrder.user.email || "";
                            }

                            return (
                              <tr
                                key={order.id || i}
                                className="hover:bg-gray-50 transition-colors group"
                              >
                                <td className="px-8 py-4 text-xs font-black uppercase text-gray-700">
                                  #{order.shop_order_code}
                                </td>
                                <td className="px-8 py-4 text-xs font-bold">
                                  <p>{customerName}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {customerContact}
                                  </p>
                                </td>
                                <td className="px-8 py-4 text-xs">
                                  {order.items.map((item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="mb-1 text-gray-600 font-medium"
                                    >
                                      {item.product_name}{" "}
                                      <span className="font-black text-black">
                                        ({item.size || item.variant?.size}/
                                        {item.color || item.variant?.color})
                                      </span>{" "}
                                      x{item.quantity}
                                    </div>
                                  ))}
                                </td>
                                <td className="px-8 py-4 text-xs font-black text-primary">
                                  {parseFloat(
                                    order.final_amount || 0,
                                  ).toLocaleString()}
                                  ₫
                                </td>
                                <td className="px-8 py-4">
                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${order.status === "PENDING" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                      order.status === "CONFIRMED" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                        order.status === "PREPARING" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                          order.status === "SHIPPING" ? "bg-purple-50 text-purple-600 border-purple-100" :
                                            order.status === "SHIPPING" ? "bg-cyan-50 text-cyan-600 border-cyan-100" :
                                              order.status === "SHIPPING" ? "bg-pink-50 text-pink-600 border-pink-100" :
                                                order.status === "SHIPPING" ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                                                  order.status === "DELIVERED" || order.status === "COMPLETED" ? "bg-green-50 text-green-600 border-green-100" :
                                                    order.status === "RETURN_PENDING" ? "bg-pink-50 text-pink-700 border-pink-200" :
                                                      order.status === "RETURNED" ? "bg-gray-50 text-gray-600 border-gray-100" :
                                                        "bg-red-50 text-red-600 border-red-100"
                                      }`}
                                  >
                                    {getOrderStatusLabel(order.status)}
                                  </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                  {order.status === "PENDING" && (
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() =>
                                          handleCancelOrder(order.id)
                                        }
                                        className="px-4 py-2 bg-white text-red-500 border-2 border-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-subtle active:translate-y-0.5 active:shadow-none"
                                      >
                                        Từ chối
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleConfirmOrder(order.id)
                                        }
                                        className="px-4 py-2 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-subtle active:translate-y-0.5 active:shadow-none"
                                      >
                                        Xác nhận đơn
                                      </button>
                                    </div>
                                  )}
                                  {order.status === "CONFIRMED" && (
                                    <button
                                      onClick={() =>
                                        handlePrepareOrder(order.id)
                                      }
                                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-subtle active:translate-y-0.5 active:shadow-none"
                                    >
                                      Chuẩn bị hàng
                                    </button>
                                  )}
                                  {order.status === "PREPARING" && (
                                    <button
                                      onClick={() => handleReadyOrder(order.id)}
                                      className="px-4 py-2 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-subtle active:translate-y-0.5 active:shadow-none"
                                    >
                                      Sẵn sàng giao hàng
                                    </button>
                                  )}
                                  {order.status === "RETURN_PENDING" && (
                                    <button
                                      onClick={() => handleConfirmReturn(order.id)}
                                      className="px-4 py-2 bg-pink-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-subtle active:translate-y-0.5 active:shadow-none"
                                    >
                                      Nhận hàng hoàn
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KHUYẾN MÃI (Promos) */}
          {activeTab === "promos" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif font-black uppercase">
                  Quản lý Khuyến mãi
                </h2>
                <button
                  onClick={() => {
                    setVoucherForm({
                      code: "",
                      description: "",
                      discount_type: "PERCENTAGE",
                      discount_value: 0,
                      min_order_amount: 0,
                      max_discount: "",
                      usage_limit: "",
                      per_user_limit: 1,
                      start_date: "",
                      end_date: "",
                      category_id: "",
                    });
                    setShowVoucherModal(true);
                  }}
                  className="btn-brutal px-6 flex items-center gap-2 text-xs"
                >
                  <Plus size={16} /> TẠO VOUCHER MỚI
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.length === 0 ? (
                  <div className="col-span-3 text-center py-10 bg-white border-2 border-dashed border-black/10 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Chưa có mã giảm giá nào được tạo
                    </p>
                  </div>
                ) : (
                  vouchers.map((v, i) => (
                    <div
                      key={v.id || i}
                      className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full group-hover:scale-150 transition-all"></div>
                      <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center">
                          <Percent size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black uppercase tracking-tight">
                            {v.discount_type === "PERCENTAGE"
                              ? `Giảm ${v.discount_value}%`
                              : `Giảm ${v.discount_value.toLocaleString()}₫`}
                          </h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Mã: <span className="text-primary">{v.code}</span>
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3 relative z-10">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 font-medium">
                            Đã sử dụng
                          </span>
                          <span className="font-black">
                            {v.used_count || 0} / {v.usage_limit || "∞"}
                          </span>
                        </div>
                        <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400">
                            Đơn tối thiểu:{" "}
                            {parseFloat(v.min_order_amount).toLocaleString()}₫
                          </span>
                          <button
                            onClick={() => handleDeleteVoucher(v.id)}
                            className="text-[9px] font-black text-red-600 hover:underline uppercase"
                          >
                            Xóa mã
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: TƯƠNG TÁC (Interactions) */}
          {activeTab === "interactions" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Comments column */}
              <div className="space-y-6">
                <h3 className="text-2xl font-serif font-black uppercase flex items-center gap-3">

                  <MessageSquare className="text-primary" /> {"Bình luận & Đánh giá"}

                </h3>
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="text-center py-10 bg-white border-2 border-dashed border-black/10 rounded-2xl">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Chưa có bình luận hay đánh giá nào
                      </p>
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black uppercase">
                              {rev.user?.profile?.full_name
                                ? rev.user.profile.full_name.substring(0, 2)
                                : "KH"}
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase">
                                {rev.user?.profile?.full_name ||
                                  rev.user?.email ||
                                  "Khách hàng"}
                              </p>
                              <div className="flex gap-0.5 mt-0.5">
                                {Array.from({ length: 5 }).map((_, s) => (
                                  <Star
                                    key={s}
                                    size={10}
                                    className={
                                      s < (rev.rating || 5)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-300"
                                    }
                                  />
                                ))}
                              </div>
                              {rev.product && (
                                <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">
                                  Sản phẩm: {rev.product.name}{" "}
                                  {rev.variant
                                    ? `(${rev.variant.size}/${rev.variant.color})`
                                    : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-gray-400">
                            {rev.created_at
                              ? new Date(rev.created_at).toLocaleDateString(
                                "vi-VN",
                              )
                              : "Gần đây"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-600 leading-relaxed mb-4 italic">
                          "{rev.comment}"
                        </p>
                        {rev.vendor_reply ? (
                          <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 mt-4">
                            <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                              Phản hồi của bạn
                            </p>
                            <p className="text-xs font-medium text-gray-700">
                              {rev.vendor_reply}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-xl p-4 border border-black/5 mt-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                              Phản hồi của bạn
                            </p>
                            <textarea
                              placeholder="Nhập phản hồi..."
                              value={replyTexts[rev.id] || ""}
                              onChange={(e) => setReplyTexts(prev => ({ ...prev, [rev.id]: e.target.value }))}
                              disabled={isReplying[rev.id]}
                              className="w-full bg-white border-2 border-black rounded-lg p-3 text-xs font-medium focus:outline-none resize-none"
                              rows={2}
                            ></textarea>
                            <div className="flex justify-end mt-2">
                              <button 
                                onClick={() => handleReplyReview(rev.id)}
                                disabled={isReplying[rev.id]}
                                className="px-4 py-1.5 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50"
                              >
                                {isReplying[rev.id] ? "Đang gửi..." : "Gửi phản hồi"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Favorites column */}
              <div className="space-y-6">
                <h3 className="text-2xl font-serif font-black uppercase flex items-center gap-3">
                  <Heart className="text-red-500" /> Sản phẩm Yêu thích nhất
                </h3>
                <div className="bg-white border-2 border-black rounded-2xl p-8 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 mb-8 italic">
                    Các sản phẩm này đang được nhiều người dùng lưu lại. Hãy tạo
                    khuyến mãi để kích cầu!
                  </p>
                  <div className="space-y-6">
                    {products.length === 0 ? (
                      <div className="text-center py-10 bg-[#FAF9F6] border-2 border-dashed border-black/10 rounded-2xl">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Chưa có sản phẩm nào
                        </p>
                      </div>
                    ) : (
                      products.slice(0, 4).map((prod, idx) => (
                        <div
                          key={prod.id || idx}
                          className="flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-14 bg-gray-100 rounded-lg overflow-hidden border border-black/5 shrink-0">
                              <img
                                src={
                                  prod.images?.[0]?.image_url ||
                                  `https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=100`
                                }
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase truncate max-w-[200px]">
                                {prod.name}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1">
                                <Heart
                                  size={10}
                                  className="text-red-500 fill-red-500"
                                />{" "}
                                {((prod.id * 17) % 150) + 12} lượt lưu
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-black">
                            {prod.price.toLocaleString()}₫
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VÍ & DOANH THU (Finance) */}
          {activeTab === "finance" && (
            <div className="space-y-10 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">

                <h2 className="text-3xl font-serif font-black uppercase">{"Tài chính & Rút tiền"}</h2>

              </div>

              {/* Cards row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Doanh thu tích lũy */}

                <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Doanh thu tích lũy</span>
                  <h4 className="text-2xl font-black tracking-tighter text-black mt-2">{(stats.revenue || 0).toLocaleString()}₫</h4>
                </div>

                {/* Card 2: Số dư chờ giải ngân */}
                <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Số dư chờ giải ngân</span>
                  <h4 className="text-2xl font-black tracking-tighter text-amber-600 mt-2">{(stats.pendingBalance || 0).toLocaleString()}₫</h4>

                </div>

                {/* Card 3: Số dư khả dụng */}
                <div

                  onClick={() => setWithdrawForm({ ...withdrawForm, amount: (stats.availableBalance || 0).toString() })}
                  className="bg-black text-white border-2 border-black rounded-3xl p-6 shadow-brutal flex flex-col justify-between h-32 cursor-pointer active:scale-95 transition-all select-none group hover:bg-neutral-900"
                  title="Click để điền nhanh số tiền cần rút"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary transition-colors">Số dư khả dụng</span>
                    <h4 className="text-2xl font-black tracking-tighter text-primary mt-1">{(stats.availableBalance || 0).toLocaleString()}₫</h4>

                  </div>
                  <span className="text-[9px] font-bold text-gray-400 italic">Click điền nhanh</span>
                </div>

                {/* Card 4: Đã rút */}
                <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Đã rút</span>
                  <h4 className="text-2xl font-black tracking-tighter text-red-600 mt-2">{(stats.withdrawnAmount || 0).toLocaleString()}₫</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Request withdrawal form */}
                <div className="lg:col-span-1 bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-6">
                    Yêu cầu rút tiền
                  </h3>
                  <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Thông tin tài khoản</span>
                      <button
                        type="button"
                        onClick={() => setShowSavedBanksModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-black rounded-xl hover:bg-gray-50 text-[10px] font-black uppercase tracking-wider active:translate-y-[1px] shadow-sm select-none"
                        title="Xem sổ tài khoản thụ hưởng"
                      >
                        <BookOpen size={14} className="text-black" style={{ strokeWidth: 3 }} />
                        Chọn từ sổ
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Số tiền rút (VND)
                      </label>
                      <input
                        type="number"
                        placeholder="Ví dụ: 500000"
                        value={withdrawForm.amount}
                        onChange={(e) =>
                          setWithdrawForm({
                            ...withdrawForm,
                            amount: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Ngân hàng thụ hưởng
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Vietcombank"
                        value={withdrawForm.bankName}
                        onChange={(e) =>
                          setWithdrawForm({
                            ...withdrawForm,
                            bankName: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-2">

                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Số tài khoản ngân hàng</label>
                      <div className="flex items-stretch gap-2">
                        <input
                          type="text"
                          placeholder="Nhập số tài khoản"
                          value={withdrawForm.accountNumber}
                          onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                          className="flex-grow bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold text-xs focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleSaveDefaultBank}
                          disabled={isSavingBank}
                          className="px-4 bg-white border-2 border-black rounded-xl hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest active:translate-y-[1px] shadow-sm select-none shrink-0 flex items-center justify-center gap-1.5"
                          title="Lưu tài khoản này làm mặc định nhận tiền của Shop"
                        >
                          {isSavingBank ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Lưu...
                            </>
                          ) : (
                            <>
                              <Save size={12} style={{ strokeWidth: 3 }} />
                              Lưu
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 leading-normal flex items-center gap-1">
                        <span>💡</span>
                        <span>Nhấn nút này để lưu thông tin tài khoản cho các lần rút tiền sau.</span>
                      </p>

                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Tên chủ tài khoản (Không dấu)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: NGUYEN VAN A"
                        value={withdrawForm.accountName}
                        onChange={(e) =>
                          setWithdrawForm({
                            ...withdrawForm,
                            accountName: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <button type="submit" className="w-full py-4 bg-black text-white border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-subtle active:translate-x-[1px] active:translate-y-[1px] mt-4">

                      GỬI YÊU CẦU RÚT TIỀN
                    </button>
                  </form>

                  {/* Rules note */}
                  <div className="bg-gray-50 border-2 border-dashed border-black rounded-xl p-4 text-[11px] font-bold text-gray-600 space-y-2 mt-4">
                    <p className="text-black font-black uppercase text-[10px] tracking-wider">💡 Quy định rút tiền:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Chỉ được rút từ <span className="text-black font-black">Số dư khả dụng</span>.</li>
                      <li>Số tiền rút tối thiểu là <span className="text-black font-black">100.000 VNĐ</span>.</li>
                      <li>Rút dưới <span className="text-black font-black">50.000.000 VNĐ</span> sẽ được xử lý ngay.</li>
                      <li>Rút từ <span className="text-black font-black">50.000.000 VNĐ</span> trở lên cần Admin phê duyệt.</li>
                    </ul>
                  </div>
                </div>

                {/* Column 2: Withdrawal list */}
                <div className="lg:col-span-2 bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm overflow-hidden">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-6 pb-2 border-b-2 border-black/5">
                    Lịch sử rút tiền
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b-2 border-black/5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/30 whitespace-nowrap">
                          <th className="px-6 py-4 whitespace-nowrap">Mã yêu cầu</th>
                          <th className="px-6 py-4 whitespace-nowrap">Thời gian</th>
                          <th className="px-6 py-4 whitespace-nowrap">Số tiền</th>
                          <th className="px-6 py-4 whitespace-nowrap">Tài khoản thụ hưởng</th>
                          <th className="px-6 py-4 whitespace-nowrap">Trạng thái</th>
                          <th className="px-6 py-4 whitespace-nowrap">Chi tiết / Lý do</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-black/5 text-xs font-bold">
                        {withdrawals.length === 0 ? (
                          <tr>

                            <td colSpan={6} className="px-6 py-8 text-center text-gray-400 uppercase tracking-widest text-[10px]">Chưa có giao dịch rút tiền nào</td>
                          </tr>
                        ) : (
                          withdrawals.map((w, idx) => {
                            const isPending = w.status === 'PENDING' || w.status === 'PENDING_APPROVAL';
                            const isCompleted = w.status === 'COMPLETED' || w.status === 'APPROVED';
                            const isRejected = w.status === 'REJECTED';

                            let statusLabel = 'Đang xử lý';
                            let statusColor = 'bg-orange-50 text-orange-600 border-orange-100';
                            if (isPending) {
                              statusLabel = 'Chờ duyệt';
                              statusColor = 'bg-yellow-50 text-yellow-600 border-yellow-100';
                            } else if (isCompleted) {
                              statusLabel = 'Thành công';
                              statusColor = 'bg-green-50 text-green-600 border-green-100';
                            } else if (isRejected) {
                              statusLabel = 'Từ chối';
                              statusColor = 'bg-red-50 text-red-600 border-red-100';
                            }

                            return (
                              <tr key={w.id || idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-black whitespace-nowrap">#WY-{w.id}</td>
                                <td className="px-6 py-4 text-[10px] text-gray-500 whitespace-nowrap">{w.created_at ? new Date(w.created_at).toLocaleString("vi-VN") : "Gần đây"}</td>
                                <td className="px-6 py-4 font-black text-red-600 whitespace-nowrap">-{parseFloat(w.amount).toLocaleString()}₫</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className="uppercase font-black text-[11px] whitespace-nowrap">{w.bank_account_name || w.account_name || 'N/A'}</p>
                                  <p className="text-[10px] text-gray-400 font-bold whitespace-nowrap">{w.bank_name} | {w.bank_account || w.account_number}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded border whitespace-nowrap ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-[10px] text-gray-500 max-w-[200px] truncate" title={w.reject_reason || ""}>
                                  {isRejected ? (
                                    <span className="text-red-500 font-bold">Lý do: {w.reject_reason || "Không có lý do cụ thể"}</span>
                                  ) : isPending && parseFloat(w.amount) >= 50000000 ? (
                                    <span className="text-gray-400 italic">Đợi duyệt (hạn mức lớn)</span>
                                  ) : (
                                    <span className="text-gray-400 italic">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })

                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Saved Banks Modal (Cuốn sổ tài khoản) */}
              {showSavedBanksModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSavedBanksModal(false)}>
                  <div className="bg-white border-[3px] border-black rounded-[2rem] p-8 max-w-md w-full shadow-brutal relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowSavedBanksModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                      <X size={20} />
                    </button>

                    <h3 className="text-xl font-serif font-black tracking-tighter uppercase mb-6 border-b-2 border-black pb-4 text-center text-black flex items-center justify-center gap-2">
                      <BookOpen size={22} /> Sổ tài khoản thụ hưởng
                    </h3>

                    <div className="max-h-72 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                      {getHistoricalBankAccounts().length === 0 ? (
                        <p className="text-center text-gray-400 text-xs py-10 uppercase tracking-widest font-black">Chưa có tài khoản nào được lưu</p>
                      ) : (
                        getHistoricalBankAccounts().map((acc, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setWithdrawForm(prev => ({
                                ...prev,
                                bankName: acc.bank_name,
                                accountNumber: acc.bank_account,
                                accountName: acc.bank_account_name
                              }));
                              setShowSavedBanksModal(false);
                            }}
                            className="p-4 border-2 border-black rounded-2xl bg-white hover:bg-red-50/50 hover:shadow-subtle transition-all cursor-pointer select-none space-y-2 relative group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-black">{acc.bank_name}</span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${acc.type === 'SAVED' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                {acc.type === 'SAVED' ? 'Mặc định' : 'Lịch sử'}
                              </span>
                            </div>
                            <p className="text-sm font-black tracking-wider text-black">{acc.bank_account}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{acc.bank_account_name}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <p className="text-[10px] font-bold text-gray-400 text-center mt-6">Click vào tài khoản để điền nhanh thông tin vào biểu mẫu rút tiền</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CHAT (Customer Chat) */}
          {activeTab === "chats" && (
            <div className="h-[calc(100vh-10rem)] bg-white border-4 border-black rounded-[2.5rem] overflow-hidden flex shadow-brutal select-none">
              {/* Contact List */}
              <div className="w-96 border-r-4 border-black flex flex-col bg-[#F9F9F7]">
                <div className="p-6 border-b-4 border-black/5">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-4">
                    Hộp thư hỗ trợ
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm khách hàng..."
                      className="w-full bg-white border-2 border-black rounded-xl px-10 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={14}
                    />
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto p-3 space-y-2 scrollbar-thin">
                  {chatCustomers.length === 0 ? (
                    <div className="text-center py-12 text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed p-4">
                      Chưa có cuộc hội thoại nào từ khách hàng
                    </div>
                  ) : (
                    chatCustomers.map((cust, idx) => (
                      <button
                        key={cust.id || idx}
                        onClick={() => setActiveChatIndex(idx)}
                        className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left active:translate-y-[1px] ${idx === activeChatIndex ? "bg-black text-white border-black shadow-subtle" : "bg-white border-transparent hover:border-black hover:shadow-subtle hover:translate-x-0.5"}`}
                      >
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full bg-primary/20 border-2 border-black flex items-center justify-center font-black text-primary uppercase overflow-hidden shadow-sm">
                            {cust.avatar ? (
                              <img
                                src={cust.avatar}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              cust.name.substring(0, 2)
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[10px] font-black uppercase truncate group-hover:text-primary transition-colors">
                                {cust.name}
                              </span>
                              {cust.role?.toUpperCase() === 'MANAGER' && (
                                <span className="bg-blue-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">Quản lý</span>
                              )}
                              {cust.role?.toUpperCase() === 'ADMIN' && (
                                <span className="bg-red-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">Admin</span>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
                              <span className="text-[8px] font-bold text-gray-400">
                                {cust.lastMessage
                                  ? new Date(
                                    cust.lastMessage.sent_at,
                                  ).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                  : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center gap-2">
                            <p
                              className={`text-[10px] truncate font-medium ${idx === activeChatIndex ? "text-gray-400" : "text-gray-500"}`}
                            >
                              {cust.lastMessage
                                ? cust.lastMessage.body
                                : "Chưa có tin nhắn"}
                            </p>
                            {cust.unreadCount > 0 && (
                              <span className="bg-red-600 text-white border border-black rounded-full px-1.5 py-0.5 text-[7px] font-black shrink-0 shadow-sm animate-pulse">
                                {cust.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-grow flex flex-col bg-white">
                {chatCustomers.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center bg-gray-50/10 p-10 text-center select-none">
                    <MessageSquare size={48} className="text-gray-300 mb-4" />
                    <h4 className="text-sm font-black uppercase tracking-widest mb-1">
                      Cửa sổ tin nhắn trống
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase max-w-xs leading-relaxed">
                      Khi có khách hàng bắt đầu trò chuyện hoặc đặt hàng, hội
                      thoại sẽ xuất hiện tại đây.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Chat Header */}
                    <div className="p-6 border-b-4 border-black/5 flex justify-between items-center bg-white">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 border-2 border-black text-primary flex items-center justify-center font-black text-xl uppercase overflow-hidden shadow-sm">
                          {chatCustomers[activeChatIndex]?.avatar ? (
                            <img
                              src={chatCustomers[activeChatIndex].avatar}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            chatCustomers[activeChatIndex]?.name.substring(0, 2)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="text-sm font-black uppercase tracking-tight">
                              {chatCustomers[activeChatIndex]?.name}
                            </h4>
                            {chatCustomers[activeChatIndex]?.role?.toUpperCase() === 'MANAGER' && (
                              <span className="bg-blue-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm shrink-0">Quản lý</span>
                            )}
                            {chatCustomers[activeChatIndex]?.role?.toUpperCase() === 'ADMIN' && (
                              <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm shrink-0">Admin</span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-green-500 flex items-center gap-1 uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>{" "}
                            Đang hoạt động
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Message History */}
                    <div className="flex-grow overflow-y-auto p-8 space-y-6 bg-[#F9F9F7] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] scrollbar-thin">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center justify-center">
                          <span className="bg-white border-2 border-black px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                            Mở đầu cuộc trò chuyện
                          </span>
                          <p className="text-[9px] font-bold text-gray-400 mt-3.5 uppercase tracking-wide">
                            Hãy gửi tin nhắn đầu tiên để kết nối với khách hàng!
                          </p>
                        </div>
                      ) : (

                        chatMessages.map((msg, idx) => {
                          const isMe = String(msg.sender_id) === String(user?.id);
                          const senderInitials = isMe ? "VS" : chatCustomers[activeChatIndex]?.name.substring(0, 2);
                          const timeStr = msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "";

                          if (isMe) {
                            return (
                              <div key={msg.id || idx} className="flex flex-row-reverse gap-4 max-w-[80%] ml-auto animate-in fade-in duration-200">
                                <div className="w-8 h-8 rounded-full bg-primary border-2 border-black text-white flex items-center justify-center text-[8px] font-black shrink-0 shadow-sm">{senderInitials}</div>
                                <div className="space-y-2 text-right">
                                  <div className="bg-black text-white border-2 border-black p-4 rounded-2xl rounded-tr-none shadow-subtle text-left">
                                    {msg.attachment_url && (
                                      <div className="mb-2 max-w-full overflow-hidden rounded-xl">
                                        {msg.attachment_type?.startsWith("image/") ? (
                                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                                            <img
                                              src={msg.attachment_url}
                                              alt={msg.attachment_name || "Attachment"}
                                              className="max-w-full max-h-[160px] object-cover rounded-lg"
                                            />
                                          </a>
                                        ) : (
                                          <a
                                            href={msg.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2.5 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 text-[10px] font-bold transition-all"
                                          >
                                            <FileText size={16} className="text-white/80" />
                                            <span className="truncate max-w-[120px]" title={msg.attachment_name || "File"}>
                                              {msg.attachment_name || "Tệp đính kèm"}
                                            </span>
                                            <Download size={14} className="ml-auto opacity-70 shrink-0" />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    {msg.body && (
                                      <p className="text-xs font-medium leading-relaxed break-words">{msg.body}</p>
                                    )}
                                  </div>
                                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mr-1">{timeStr}</span>

                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div key={msg.id || idx} className="flex gap-4 max-w-[80%] animate-in fade-in duration-200">
                                <div className="w-8 h-8 rounded-full bg-black text-white border-2 border-black flex items-center justify-center text-[8px] font-black shrink-0 uppercase overflow-hidden shadow-sm">
                                  {chatCustomers[activeChatIndex]?.avatar ? (
                                    <img src={chatCustomers[activeChatIndex].avatar} alt="avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    senderInitials
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="bg-white border-2 border-black p-4 rounded-2xl rounded-tl-none shadow-subtle">
                                    {msg.attachment_url && (
                                      <div className="mb-2 max-w-full overflow-hidden rounded-xl">
                                        {msg.attachment_type?.startsWith("image/") ? (
                                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                                            <img
                                              src={msg.attachment_url}
                                              alt={msg.attachment_name || "Attachment"}
                                              className="max-w-full max-h-[160px] object-cover rounded-lg"
                                            />
                                          </a>
                                        ) : (
                                          <a
                                            href={msg.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-black bg-gray-50 text-black hover:bg-gray-150 text-[10px] font-bold transition-all"
                                          >
                                            <FileText size={16} className="text-primary" />
                                            <span className="truncate max-w-[120px]" title={msg.attachment_name || "File"}>
                                              {msg.attachment_name || "Tệp đính kèm"}
                                            </span>
                                            <Download size={14} className="ml-auto opacity-70 shrink-0" />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    {msg.body && (
                                      <p className="text-xs font-medium leading-relaxed break-words">{msg.body}</p>
                                    )}
                                  </div>
                                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">{timeStr}</span>
                                </div>
                              </div>
                            );
                          }
                        })
                      )}
                    </div>

                    {/* Chat Input */}

                    <form onSubmit={handleSendMessage} className="p-6 border-t-4 border-black bg-white select-none">
                      {/* File Upload Preview */}
                      {(isUploading || attachedFile) && (
                        <div className="mb-4 p-3 bg-[#F9F9F7] border-2 border-black rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          {isUploading ? (
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold py-1">
                              <Loader2 className="animate-spin text-black" size={14} />
                              <span>Đang tải tệp lên...</span>
                            </div>
                          ) : attachedFile ? (
                            <>
                              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-black shrink-0 flex items-center justify-center bg-white shadow-sm">
                                {attachedFile.type.startsWith("image/") ? (
                                  <img src={attachedFile.url} alt="Attached Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <FileText size={18} className="text-black" />
                                )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <p className="text-[10px] font-black uppercase text-black truncate">
                                  {attachedFile.name}
                                </p>
                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                                  {attachedFile.type.startsWith("image/") ? "Hình ảnh" : "Tài liệu"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveAttachedFile}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95"
                                title="Hủy đính kèm"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      )}

                      <div className="flex items-center gap-4 bg-gray-50 border-2 border-black rounded-2xl p-2 pl-4 shadow-inner">
                        <EmojiPicker
                          onSelectEmoji={(emoji) => setChatInputText((prev) => prev + emoji)}
                          theme="neo"
                        />
                        <button
                          type="button"
                          onClick={handleTriggerFileInput}
                          disabled={isUploading}
                          className="text-gray-400 hover:text-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center p-2 rounded-xl hover:bg-gray-150 shrink-0"
                          title="Đính kèm tệp"
                        >
                          <Paperclip size={20} />

                        </button>
                        <input
                          type="text"
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                          placeholder="Nhập tin nhắn phản hồi..."
                          className="flex-grow bg-transparent border-none focus:outline-none font-bold text-sm py-2"
                          disabled={isUploading}
                        />

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        />
                        <button
                          type="submit"
                          className={`p-3 rounded-xl transition-all cursor-pointer active:translate-y-[1px] ${(chatInputText.trim() || attachedFile) && !isUploading ? "bg-black text-white shadow-subtle" : "text-gray-300"}`}
                          disabled={(!chatInputText.trim() && !attachedFile) || isUploading}

                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: CẤU HÌNH SHOP (Settings) */}
          {activeTab === "settings" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif font-black uppercase">
                  Thông tin cửa hàng
                </h2>
              </div>

              <div className="bg-white border-2 border-black rounded-[2.5rem] p-10 shadow-sm max-w-3xl">
                <form onSubmit={handleSettingsSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                      Tên gian hàng
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-3.5 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={settingsForm.name}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                        Số điện thoại kinh doanh
                      </label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-3.5 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={settingsForm.phone}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            phone: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                        Ngành hàng chính
                      </label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-3.5 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={settingsForm.industry}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            industry: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                      Địa chỉ lấy hàng
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-3.5 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                      value={settingsForm.address}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          address: e.target.value,
                        })
                      }
                      required
                    ></textarea>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                      Mô tả shop
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-3.5 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                      value={settingsForm.description}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          description: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>

                  {/* Shop Avatar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                        Ảnh đại diện cửa hàng (Avatar)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShopAvatarType("url")}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-black rounded-lg transition-all ${shopAvatarType === "url" ? "bg-black text-white shadow-sm" : "bg-white text-black hover:bg-gray-50 active:translate-y-[1px]"}`}
                        >
                          Sử dụng URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setShopAvatarType("file")}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-black rounded-lg transition-all ${shopAvatarType === "file" ? "bg-black text-white shadow-sm" : "bg-white text-black hover:bg-gray-50 active:translate-y-[1px]"}`}
                        >
                          Tải ảnh từ máy
                        </button>
                      </div>
                    </div>

                    {shopAvatarType === "url" ? (
                      <input
                        type="text"
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-3.5 font-bold focus:outline-none"
                        value={settingsForm.avatar_url}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            avatar_url: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <label className="flex-grow flex items-center justify-center border-2 border-dashed border-black rounded-xl py-3 px-5 bg-gray-50 hover:bg-gray-100/50 cursor-pointer transition-colors relative active:translate-y-[1px]">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleShopAvatarUpload}
                            disabled={isUploadingShopImage}
                            id="shop-avatar-file"
                          />
                          <span className="text-xs font-bold text-gray-600">
                            {isUploadingShopImage
                              ? "Đang tải ảnh lên..."
                              : "Chọn ảnh từ thiết bị của bạn"}
                          </span>
                        </label>
                        {settingsForm.avatar_url && (
                          <div className="w-12 h-12 rounded-xl border-2 border-black overflow-hidden shrink-0">
                            <img
                              src={settingsForm.avatar_url}
                              alt="Preview Avatar"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shop Cover */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                        Ảnh bìa cửa hàng (Cover)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShopCoverType("url")}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-black rounded-lg transition-all ${shopCoverType === "url" ? "bg-black text-white shadow-sm" : "bg-white text-black hover:bg-gray-50 active:translate-y-[1px]"}`}
                        >
                          Sử dụng URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setShopCoverType("file")}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-black rounded-lg transition-all ${shopCoverType === "file" ? "bg-black text-white shadow-sm" : "bg-white text-black hover:bg-gray-50 active:translate-y-[1px]"}`}
                        >
                          Tải ảnh từ máy
                        </button>
                      </div>
                    </div>

                    {shopCoverType === "url" ? (
                      <input
                        type="text"
                        className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-3.5 font-bold focus:outline-none"
                        value={settingsForm.cover_url}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            cover_url: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <label className="flex-grow flex items-center justify-center border-2 border-dashed border-black rounded-xl py-3 px-5 bg-gray-50 hover:bg-gray-100/50 cursor-pointer transition-colors relative active:translate-y-[1px]">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleShopCoverUpload}
                            disabled={isUploadingShopImage}
                            id="shop-cover-file"
                          />
                          <span className="text-xs font-bold text-gray-600">
                            {isUploadingShopImage
                              ? "Đang tải ảnh lên..."
                              : "Chọn ảnh từ thiết bị của bạn"}
                          </span>
                        </label>
                        {settingsForm.cover_url && (
                          <div className="w-20 h-12 rounded-xl border-2 border-black overflow-hidden shrink-0">
                            <img
                              src={settingsForm.cover_url}
                              alt="Preview Cover"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-8 py-4 bg-black text-white border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-subtle active:translate-y-0.5 active:shadow-none"
                  >
                    Lưu thông tin cửa hàng
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Phân trang sản phẩm */}

          {activeTab === 'products' && productView === 'list' && productsTotal > 0 && (
            <div className="flex justify-center items-center gap-2 pt-12">
              <button
                onClick={() => setProductsPage((p) => Math.max(p - 1, 1))}
                className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center hover:bg-black hover:text-white transition-all active:translate-y-1"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.ceil(productsTotal / 5) }).map(
                (_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setProductsPage(idx + 1)}
                    className={`w-10 h-10 border-2 border-black rounded-xl font-black text-xs transition-all ${productsPage === idx + 1 ? "bg-black text-white" : "hover:bg-primary/10 active:translate-y-1"}`}
                  >
                    {idx + 1}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setProductsPage((p) =>
                    Math.min(p + 1, Math.ceil(productsTotal / 5)),
                  )
                }
                className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center hover:bg-black hover:text-white transition-all active:translate-y-1"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL TẠO MÃ GIẢM GIÁ --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border-4 border-black rounded-[2.5rem] w-full max-w-2xl shadow-brutal p-8 relative">
            <button
              onClick={() => setShowVoucherModal(false)}
              className="absolute top-6 right-6 p-2 border-2 border-black rounded-xl hover:bg-gray-100 transition-all"
            >
              <X size={18} />
            </button>
            <h3 className="text-2xl font-serif font-black uppercase tracking-tighter mb-6">
              Tạo mã giảm giá mới
            </h3>
            <form onSubmit={handleVoucherSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Mã Coupon (Ví dụ: SALE20)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold uppercase"
                    value={voucherForm.code}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, code: e.target.value })
                    }
                    required
                  />
                </div>
                <CustomSelect
                  label="Loại giảm giá"
                  value={voucherForm.discount_type}
                  placeholder="-- Chọn loại giảm giá --"
                  options={[
                    { value: "PERCENTAGE", label: "Giảm theo phần trăm (%)" },
                    {
                      value: "FIXED_AMOUNT",
                      label: "Giảm số tiền cố định (₫)",
                    },
                  ]}
                  onChange={(val) =>
                    setVoucherForm({
                      ...voucherForm,
                      discount_type: val as "PERCENTAGE" | "FIXED_AMOUNT",
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <CustomSelect
                  label="Loại sản phẩm áp dụng"
                  value={voucherForm.category_id}
                  placeholder="Áp dụng cho tất cả sản phẩm"
                  options={[
                    { value: "", label: "Áp dụng cho tất cả sản phẩm" },
                    ...categories.map((c) => ({
                      value: c.id.toString(),
                      label: c.name,
                    })),
                  ]}
                  onChange={(val) =>
                    setVoucherForm({ ...voucherForm, category_id: val })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Giá trị giảm
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold"
                    value={voucherForm.discount_value}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        discount_value: parseFloat(e.target.value || "0"),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Đơn hàng tối thiểu (₫)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold"
                    value={voucherForm.min_order_amount}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        min_order_amount: parseFloat(e.target.value || "0"),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Giảm tối đa (₫)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold"
                    value={voucherForm.max_discount}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        max_discount: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Tổng lượt dùng tối đa
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold"
                    value={voucherForm.usage_limit}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        usage_limit: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Giới hạn/Người dùng
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold"
                    value={voucherForm.per_user_limit}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        per_user_limit: parseInt(e.target.value || "1"),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Mô tả mã giảm giá
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold"
                  value={voucherForm.description}
                  onChange={(e) =>
                    setVoucherForm({
                      ...voucherForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <button
                type="submit"
                className="w-full btn-brutal py-4 text-xs font-black uppercase tracking-widest shadow-brutal hover:bg-primary active:translate-y-0.5 active:shadow-none"
              >
                Tạo Voucher ngay
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black rounded-[2rem] w-full max-w-md shadow-brutal p-8 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() =>
                setConfirmModal((prev) => ({ ...prev, isOpen: false }))
              }
              className="absolute top-6 right-6 p-2 border-2 border-black rounded-xl hover:bg-gray-100 transition-all"
            >
              <X size={18} />
            </button>
            <h3 className="text-xl font-serif font-black uppercase tracking-tighter mb-4 text-black">
              {confirmModal.title}
            </h3>
            <p className="text-gray-600 text-sm font-bold leading-relaxed mb-8">
              {confirmModal.message}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 py-4 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-white hover:bg-gray-50 transition-all active:translate-y-[2px]"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-4 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-primary text-black shadow-subtle hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Return Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border-2 border-black rounded-[2rem] p-6 shadow-brutal animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-4 mb-6">
              <h3 className="font-black text-xl text-red-500 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={24} />
                Từ chối trả hàng
              </h3>
              <button
                onClick={() => setRejectModal({ isOpen: false, returnId: null, rejectNote: "" })}
                className="p-2 hover:bg-red-50 rounded-full transition-colors text-gray-500 hover:text-red-500"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">
                  Lý do từ chối (Bắt buộc)
                </label>
                <textarea
                  value={rejectModal.rejectNote}
                  onChange={(e) => setRejectModal({ ...rejectModal, rejectNote: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-4 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all h-32 resize-none"
                  placeholder="Nhập lý do chi tiết..."
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                  Gợi ý lý do:
                </label>
                <div className="flex flex-wrap gap-2">
                  {REJECT_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setRejectModal({ ...rejectModal, rejectNote: suggestion })}
                      className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 hover:text-black transition-colors text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t-2 border-black/10 mt-6">
                <button
                  onClick={() => setRejectModal({ isOpen: false, returnId: null, rejectNote: "" })}
                  className="flex-1 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitReject}
                  disabled={!rejectModal.rejectNote.trim()}
                  className="flex-1 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-500 text-white shadow-subtle hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CHỌN ẢNH CHÍNH (PRIMARY IMAGE) CONFIRMATION MODAL --- */}
      {showPrimaryConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white border-4 border-black rounded-[2.5rem] p-8 max-w-md w-full shadow-brutal animate-bounce-in">
            <h3 className="text-xl font-serif font-black uppercase tracking-tighter mb-4 text-black">
              Chọn ảnh chính (Primary Image)
            </h3>
            <p className="text-xs font-bold text-gray-500 mb-6 leading-relaxed">
              Bạn vừa thêm một ảnh mới cho sản phẩm. Bạn có muốn đặt ảnh này làm <strong>Ảnh chính</strong> (ảnh hiển thị đầu tiên) cho sản phẩm không?
            </p>
            {pendingImageUrl && (
              <div className="aspect-[4/5] rounded-[2rem] border-2 border-black overflow-hidden mb-6 max-w-[150px] mx-auto shadow-subtle">
                <img src={pendingImageUrl} alt="Pending" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setPrimaryImageUrl(pendingImageUrl);
                  setProductForm(prev => ({ ...prev, image_url: pendingImageUrl }));
                  setShowPrimaryConfirm(false);
                  setPendingImageUrl("");
                }}
                className="flex-grow py-3 border-2 border-black rounded-xl text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-primary hover:text-black transition-all active:translate-y-[1px] shadow-subtle"
              >
                CÓ, ĐẶT LÀM ẢNH CHÍNH
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrimaryConfirm(false);
                  setPendingImageUrl("");
                }}
                className="flex-grow py-3 border-2 border-black rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-gray-50 transition-all active:translate-y-[1px]"
              >
                KHÔNG, GIỮ ẢNH CŨ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;

import {
  MapPin,
  Truck,
  CreditCard,
  Wallet,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  Package,
  Loader2,
  Store,
  Landmark,
  Pencil,
  Trash2,
  Tag,
  Check,
  Ticket,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/app/stores/hooks";
import { useCart } from "@/hooks/useCart";
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from "@/hooks/useAddresses";
import { useCalculateCheckout, useCreateOrder } from "@/hooks/useOrders";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useProfile } from "@/hooks/useUser";
import { useMySavedCoupons } from "@/hooks/useCoupons";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { CreateOrderPayload } from "@/shared/types/order.types";

const addressSchema = yup.object().shape({
  recipient_name: yup.string().required("Vui lòng nhập tên người nhận"),
  phone_number: yup.string().required("Vui lòng nhập số điện thoại"),
  address_line: yup.string().required("Vui lòng nhập địa chỉ giao hàng"),
  note: yup.string().optional(),
});

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth/login?redirect=/checkout");
    }
  }, [isAuthenticated, navigate]);

  const buyNowItem = location.state?.buyNowItem;
  const selectedItems = location.state?.selectedItems;
  const { data: cart, isLoading: isCartLoading } = useCart();
  const { data: addresses, isLoading: isAddressesLoading } = useAddresses();
  const { data: profile } = useProfile();
  const { data: validCoupons } = useMySavedCoupons();

  const createOrderMutation = useCreateOrder();
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const calculateMutation = useCalculateCheckout();

  const { data: systemSettings } = useSystemSettings() as any;

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "VNPAY">("COD");
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [openShopCouponDropdownId, setOpenShopCouponDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [couponCode, setCouponCode] = useState("");
  const [inputCoupon, setInputCoupon] = useState("");
  const [shopCoupons, setShopCoupons] = useState<Record<string, string>>({});
  const [usePoints, setUsePoints] = useState(false);
  const [calculatedData, setCalculatedData] = useState<any>(null);

  const platformCoupons = validCoupons?.filter((c: any) => !c.shop_id) || [];
  const availableShopCoupons = validCoupons?.filter((c: any) => c.shop_id) || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm({
    resolver: yupResolver(addressSchema),
  });

  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId && !isAddingNewAddress) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      setValue("recipient_name", defaultAddr.recipient_name);
      setValue("phone_number", defaultAddr.phone_number);
      setValue("address_line", defaultAddr.address_line);
    } else if (addresses && addresses.length === 0) {
      setIsAddingNewAddress(true);
    }
  }, [addresses, selectedAddressId, isAddingNewAddress, setValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenShopCouponDropdownId(null);
      }
    };
    if (openShopCouponDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openShopCouponDropdownId]);

  const handleSelectAddress = (id: number) => {
    setSelectedAddressId(id);
    setIsAddingNewAddress(false);
    const addr = addresses?.find((a) => a.id === id);
    if (addr) {
      setValue("recipient_name", addr.recipient_name);
      setValue("phone_number", addr.phone_number);
      setValue("address_line", addr.address_line);
    }
  };

  const handleAddNewAddress = () => {
    setSelectedAddressId(null);
    setIsAddingNewAddress(true);
    setEditingAddressId(null);
    setValue('recipient_name', '');
    setValue('phone_number', '');
    setValue('address_line', '');
  };

  const handleSaveAddress = async () => {
    const name = getValues('recipient_name');
    const phone = getValues('phone_number');
    const line = getValues('address_line');

    if (!name || !phone || !line) {
      alert("Vui lòng điền đầy đủ thông tin địa chỉ!");
      return;
    }

    try {
      if (editingAddressId) {
        await updateAddressMutation.mutateAsync({
          id: editingAddressId,
          payload: { recipient_name: name, phone_number: phone, address_line: line }
        });
        alert("Cập nhật địa chỉ thành công!");
      } else {
        const newAddr = await createAddressMutation.mutateAsync({
          recipient_name: name,
          phone_number: phone,
          address_line: line,
          is_default: addresses?.length === 0,
        });
        if (newAddr && newAddr.id) {
          setSelectedAddressId(newAddr.id);
        }
        alert("Thêm địa chỉ thành công!");
      }
      setIsAddingNewAddress(false);
      setEditingAddressId(null);
    } catch (error) {
      console.error(error);
      alert(editingAddressId ? "Cập nhật địa chỉ thất bại!" : "Thêm địa chỉ thất bại!");
    }
  };

  const handleCancelAddressEdit = () => {
    setIsAddingNewAddress(false);
    setEditingAddressId(null);
    if (selectedAddressId) {
      const addr = addresses?.find(a => a.id === selectedAddressId);
      if (addr) {
        setValue('recipient_name', addr.recipient_name);
        setValue('phone_number', addr.phone_number);
        setValue('address_line', addr.address_line);
      }
    } else {
      setValue('recipient_name', '');
      setValue('phone_number', '');
      setValue('address_line', '');
    }
  };

  const handleEditAddress = (e: React.MouseEvent, addr: any) => {
    e.stopPropagation();
    setEditingAddressId(addr.id);
    setIsAddingNewAddress(true);
    setValue('recipient_name', addr.recipient_name);
    setValue('phone_number', addr.phone_number);
    setValue('address_line', addr.address_line);
  };

  const handleDeleteAddress = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) {
      try {
        await deleteAddressMutation.mutateAsync(id);
        alert("Xóa địa chỉ thành công!");
        if (selectedAddressId === id) {
          setSelectedAddressId(null);
        }
      } catch (error) {
        alert("Xóa địa chỉ thất bại!");
      }
    }
  };

  const handleNextStep = async () => {
    if (isAddingNewAddress) {
      const name = getValues('recipient_name');
      const phone = getValues('phone_number');
      const line = getValues('address_line');

      if (!name || !phone || !line) {
        alert("Vui lòng điền đầy đủ thông tin địa chỉ trước khi tiếp tục!");
        return;
      }

      try {
        if (editingAddressId) {
          await updateAddressMutation.mutateAsync({
            id: editingAddressId,
            payload: { recipient_name: name, phone_number: phone, address_line: line }
          });
        } else {
          const newAddr = await createAddressMutation.mutateAsync({
            recipient_name: name,
            phone_number: phone,
            address_line: line,
            is_default: addresses?.length === 0,
          });
          if (newAddr && newAddr.id) {
            setSelectedAddressId(newAddr.id);
          }
        }
        setIsAddingNewAddress(false);
        setEditingAddressId(null);
        setCurrentStep(2);
      } catch (error) {
        console.error(error);
        alert(editingAddressId ? "Cập nhật địa chỉ thất bại!" : "Lưu địa chỉ thất bại!");
      }
    } else {
      if (!selectedAddressId) {
        alert("Vui lòng chọn hoặc thêm địa chỉ nhận hàng!");
        return;
      }
      setCurrentStep(2);
    }
  };

  const onSubmit = async (data: any) => {
    const checkoutItems = buyNowItem ? [buyNowItem] : (selectedItems || cart?.items || []);

    if (checkoutItems.length === 0) {
      alert("Đơn hàng của bạn đang trống!");
      return;
    }

    if (isAddingNewAddress && !selectedAddressId) {
      alert("Vui lòng nhấn Lưu địa chỉ trước khi tiếp tục!");
      return;
    }

    const payload: CreateOrderPayload = {
      addressId: selectedAddressId || undefined,
      note: data.note,
      paymentMethod: paymentMethod,
      platformCouponCode: couponCode || undefined,
      shopCoupons: shopCoupons,
      usePoints: usePoints,
      items: checkoutItems.map((item: any) => ({
        product_id: item.product_id || item.variant?.product?.id || item.product?.id,
        variant_id: item.product_variant_id || item.variant_id || item.variant?.id || undefined,
        quantity: item.quantity,
        unit_price: item.variant?.sale_price || item.variant?.price || item.unit_price,
        cart_item_id: item.cart_item_id || item.id,
      })),
      is_cart_checkout: !buyNowItem,
    };

    createOrderMutation.mutate(payload, {
      onSuccess: (resData: any) => {
        if (resData && resData.paymentUrl) {
          window.location.href = resData.paymentUrl;
        } else {
          setCurrentStep(3);
        }
      },
      onError: (error) => {
        console.error("Lỗi khi đặt hàng", error);
        alert("Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại!");
      },
    });
  };

  const cartItems = buyNowItem ? [buyNowItem] : (selectedItems || cart?.items || []);
  const subtotal = buyNowItem ? buyNowItem.unit_price * buyNowItem.quantity : cartItems.reduce((acc: number, item: any) => {
    const price = item.variant?.sale_price || item.variant?.price || item.unit_price || 0;
    return acc + (Number(price) * item.quantity);
  }, 0);

  const groupedCartItems = cartItems.reduce((acc: any, item: any) => {
    const product = item.variant?.product || item.product;
    const shopId = product?.shop?.id || product?.shop_id || "unknown";
    if (!acc[shopId]) {
      acc[shopId] = {
        shop: product?.shop || { id: product?.shop_id, name: "Cửa hàng thời trang" },
        items: [],
      };
    }
    acc[shopId].items.push(item);
    return acc;
  }, {});

  const shopGroups: any[] = Object.values(groupedCartItems);
  const fallbackShippingFee = shopGroups.length > 0 ? shopGroups.length * 30000 : 0;

  useEffect(() => {
    if (cartItems.length > 0) {
      calculateMutation.mutate(
        {
          items: cartItems.map((item: any) => ({
            product_id: item.product_id || item.variant?.product?.id || item.product?.id,
            variant_id: item.product_variant_id || item.variant_id || item.variant?.id || undefined,
            quantity: item.quantity,
            unit_price: item.variant?.sale_price || item.variant?.price || item.unit_price,
            cart_item_id: item.cart_item_id || item.id,
          })),
          platformCouponCode: couponCode || undefined,
          shopCoupons: shopCoupons,
          usePoints,
        },
        {
          onSuccess: (data) => setCalculatedData(data),
          onError: (error: any) => {
            const errMsg = error.response?.data?.message || "Lỗi khi áp dụng mã giảm giá";
            alert(errMsg);
            if (couponCode) {
              setCouponCode("");
              setInputCoupon("");
            }
          },
        }
      );
    }
  }, [couponCode, shopCoupons, usePoints]);

  const isCodBlocked = calculatedData?.isCodBlocked || false;

  useEffect(() => {
    if (isCodBlocked && paymentMethod === "COD") {
      setPaymentMethod("VNPAY");
    }
  }, [isCodBlocked, paymentMethod]);

  if (isCartLoading || isAddressesLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const displaySubtotal = calculatedData ? calculatedData.parentSubtotal : subtotal;
  const discountAmount = calculatedData ? calculatedData.totalShopDiscount + calculatedData.platformDiscount : 0;
  const pointsDiscount = calculatedData ? calculatedData.pointsDiscount || 0 : 0;
  const currentShippingFee = calculatedData ? calculatedData.totalShippingFee : fallbackShippingFee;
  const displayTotal = calculatedData ? calculatedData.totalAmount : subtotal + currentShippingFee;

  const handleApplyCoupon = () => {
    setCouponCode(inputCoupon);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        {currentStep < 3 && (
          <div className="mb-12 flex items-center justify-between">
            <Link to="/cart" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:text-primary transition-all">
              <ChevronLeft size={20} /> Quay lại giỏ hàng
            </Link>
            <div className="flex gap-4 items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep >= 1 ? "text-primary border-b-2 border-primary" : "text-gray-400"}`}>01 Thông tin</span>
              <span className="w-8 h-[2px] bg-gray-200"></span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep >= 2 ? "text-primary border-b-2 border-primary" : "text-gray-400"}`}>02 Thanh toán</span>
              <span className="w-8 h-[2px] bg-gray-200"></span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === 3 ? "text-primary border-b-2 border-primary" : "text-gray-400"}`}>03 Hoàn tất</span>
            </div>
          </div>
        )}

        {currentStep === 3 ? (
          <div className="max-w-2xl mx-auto mt-20 text-center space-y-8">
            <div className="w-32 h-32 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-primary">
              <Check size={64} strokeWidth={3} />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight uppercase text-[#ee4d2d]">
              Đặt hàng thành công!
            </h1>
            <p className="text-gray-500 font-medium text-base">
              Cảm ơn bạn đã mua sắm tại MeeMart. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.
            </p>
            <div className="flex justify-center gap-4 mt-8">
              <Link
                to="/orders"
                className="bg-[#ee4d2d] text-white px-8 py-3 rounded-lg font-semibold text-xs uppercase tracking-wider hover:bg-[#d03e1e] transition-colors shadow-xs"
              >
                Xem đơn hàng
              </Link>
              <Link
                to="/"
                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 px-8 py-3 rounded-lg font-semibold text-xs uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái: Form Thông tin hoặc Phương thức thanh toán */}
            <div className="lg:col-span-8 space-y-4">
              {currentStep === 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  {/* Shopee Postcard Stripe Ribbon */}
                  <div className="h-1 w-full bg-[repeating-linear-gradient(45deg,#ee4d2d,#ee4d2d_25px,#fff_25px,#fff_35px,#0046be_35px,#0046be_60px,#fff_60px,#fff_70px)]" />

                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                        <MapPin className="text-[#ee4d2d]" size={18} /> Địa chỉ nhận hàng
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddNewAddress}
                        className="text-xs font-bold text-[#ee4d2d] hover:underline uppercase"
                      >
                        + Thêm địa chỉ mới
                      </button>
                    </div>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {addresses?.map(addr => (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr.id)}
                        className={`p-5 rounded-2xl relative cursor-pointer group transition-all border-2 ${selectedAddressId === addr.id ? 'border-primary bg-primary/5 shadow-brutal' : 'border-black bg-white hover:shadow-subtle'}`}
                      >
                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center bg-white border-2 ${selectedAddressId === addr.id ? 'border-primary' : 'border-black'}`}>
                          {selectedAddressId === addr.id && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                        </div>
                        <p className="text-xs font-black uppercase mb-1">
                          {addr.recipient_name}
                          {addr.is_default && <span className="ml-2 text-[10px] text-primary bg-white px-2 py-0.5 border border-primary rounded font-bold">Mặc định</span>}
                        </p>
                        <p className="text-xs font-bold text-gray-500">{addr.phone_number}</p>
                        <p className="text-xs font-medium text-gray-600 mt-2 leading-relaxed max-w-[80%]">{addr.address_line}</p>

                        <div className="absolute bottom-4 right-4 flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={(e) => handleEditAddress(e, addr)} className="p-2 bg-white border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all"><Pencil size={12} /></button>
                          <button type="button" onClick={(e) => handleDeleteAddress(e, addr.id)} className="p-2 bg-white border-2 border-red-500 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(isAddingNewAddress || (addresses && addresses.length === 0)) && (
                    <div className="border-2 border-dashed border-black rounded-2xl p-6 bg-gray-50/50 space-y-4 mt-6">
                      <p className="text-sm font-black uppercase">{editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <input {...register('recipient_name')} placeholder="Họ và tên" className="w-full bg-gray-50 border-2 border-black/20 rounded-xl px-4 py-3 font-bold text-sm focus:border-primary outline-none transition-colors" />
                          {errors.recipient_name && <p className="text-red-500 text-xs mt-1 font-bold">{errors.recipient_name.message as string}</p>}
                        </div>
                        <div>
                          <input {...register('phone_number')} placeholder="Số điện thoại" className="w-full bg-gray-50 border-2 border-black/20 rounded-xl px-4 py-3 font-bold text-sm focus:border-primary outline-none transition-colors" />
                          {errors.phone_number && <p className="text-red-500 text-xs mt-1 font-bold">{errors.phone_number.message as string}</p>}
                        </div>
                      </div>
                      <div>
                        <input {...register('address_line')} placeholder="Địa chỉ chi tiết" className="w-full bg-gray-50 border-2 border-black/20 rounded-xl px-4 py-3 font-bold text-sm focus:border-primary outline-none transition-colors" />
                        {errors.address_line && <p className="text-red-500 text-xs mt-1 font-bold">{errors.address_line.message as string}</p>}
                      </div>
                      <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={handleCancelAddressEdit} className="border-2 border-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50">Hủy bỏ</button>
                        <button type="button" onClick={handleSaveAddress} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-all">Lưu địa chỉ</button>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-8 border-t border-dashed border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Ghi chú cho đơn hàng</p>
                    <textarea {...register('note')} rows={2} placeholder="Ví dụ: Giao giờ hành chính..." className="w-full bg-gray-50 border-2 border-black/20 rounded-xl px-4 py-3 font-bold text-sm focus:border-primary outline-none transition-colors resize-none"></textarea>
                  </div>

                    <div className="mt-8 flex justify-end">
                      <button type="button" onClick={handleNextStep} className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white px-8 py-3 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors shadow-xs">Tiếp tục thanh toán</button>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  {/* Địa chỉ tóm tắt */}
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xs sm:rounded-sm border border-black/[0.06] dark:border-slate-700/60 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#fef0ed] dark:bg-[#ee4d2d]/20 rounded-full flex items-center justify-center text-[#ee4d2d]">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-gray-500 dark:text-slate-400">Giao đến</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate max-w-sm">
                          {addresses?.find(a => a.id === selectedAddressId)?.address_line || "Chưa có địa chỉ"}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-xs font-semibold text-[#ee4d2d] hover:underline cursor-pointer">
                      Thay đổi
                    </button>
                  </div>

                  {/* Vận chuyển */}
                  <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xs sm:rounded-sm border border-black/[0.06] dark:border-slate-700/60 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Truck className="text-[#ee4d2d]" size={16} /> Phương thức vận chuyển
                    </h3>
                    <label className="relative flex items-center justify-between p-3.5 bg-[#fef0ed]/40 dark:bg-slate-700/60 border border-[#ee4d2d] rounded-xs cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-[#ee4d2d] flex items-center justify-center bg-white">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#ee4d2d]" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">Giao hàng tiêu chuẩn</p>
                          <p className="text-[11px] text-gray-500">Dự kiến giao: 2-3 ngày</p>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[#ee4d2d]">{currentShippingFee.toLocaleString()}₫</span>
                    </label>
                  </div>

                  {/* Thanh toán */}
                  <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xs sm:rounded-sm border border-black/[0.06] dark:border-slate-700/60 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <CreditCard className="text-[#ee4d2d]" size={16} /> Phương thức thanh toán
                    </h3>
                    <div className="space-y-2.5">
                      <button 
                        type="button" 
                        disabled={isCodBlocked}
                        onClick={() => !isCodBlocked && setPaymentMethod("COD")} 
                        className={`w-full flex items-center justify-between p-3.5 border rounded-xs transition-colors text-left cursor-pointer ${
                          isCodBlocked
                            ? 'bg-gray-100 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                            : paymentMethod === 'COD'
                            ? 'bg-[#fef0ed]/40 dark:bg-slate-700/60 border-[#ee4d2d]'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Wallet size={20} className={isCodBlocked ? 'text-gray-300' : paymentMethod === 'COD' ? 'text-[#ee4d2d]' : 'text-gray-400'} />
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">Thanh toán khi nhận hàng (COD)</p>
                            {isCodBlocked && (
                              <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                Bị khóa tạm thời do hủy/bom hàng quá nhiều lần
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white ${paymentMethod === 'COD' ? 'border-[#ee4d2d]' : 'border-gray-300'}`}>
                          {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-[#ee4d2d]" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("VNPAY")}
                        className={`w-full flex items-center justify-between p-3.5 border rounded-xs transition-colors text-left cursor-pointer ${
                          paymentMethod === 'VNPAY'
                            ? 'bg-[#fef0ed]/40 dark:bg-slate-700/60 border-[#ee4d2d]'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Landmark size={20} className={paymentMethod === 'VNPAY' ? 'text-[#ee4d2d]' : 'text-gray-400'} />
                          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">Thanh toán qua VNPAY / Ví điện tử</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white ${paymentMethod === 'VNPAY' ? 'border-[#ee4d2d]' : 'border-gray-300'}`}>
                          {paymentMethod === 'VNPAY' && <div className="w-2 h-2 rounded-full bg-[#ee4d2d]" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Voucher & Điểm tích lũy */}
                  <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xs sm:rounded-sm border border-black/[0.06] dark:border-slate-700/60 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Tag className="text-[#ee4d2d]" size={16} /> Khuyến mãi & Điểm
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Mã giảm giá sàn</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inputCoupon}
                            onChange={(e) => setInputCoupon(e.target.value)}
                            placeholder="Nhập mã voucher..."
                            className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xs px-3 py-2 uppercase text-xs sm:text-sm font-semibold focus:border-[#ee4d2d] outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={calculateMutation.isPending}
                            className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white px-5 py-2 rounded-xs font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            Áp dụng
                          </button>
                        </div>
                        {couponCode && (
                          <div className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <Check size={14} /> Đang áp dụng mã: {couponCode}
                            <button type="button" className="text-red-500 ml-2 hover:underline cursor-pointer" onClick={() => { setCouponCode(""); setInputCoupon(""); }}>Hủy</button>
                          </div>
                        )}
                      </div>

                      {platformCoupons.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {platformCoupons.map((coupon: any) => (
                            <button
                              key={coupon.id}
                              type="button"
                              onClick={() => { setInputCoupon(coupon.code); setCouponCode(coupon.code); }}
                              className={`shrink-0 border rounded-xs p-2.5 text-left transition-colors cursor-pointer ${
                                couponCode === coupon.code
                                  ? "border-[#ee4d2d] bg-[#fef0ed]/50 text-[#ee4d2d]"
                                  : "border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 hover:border-gray-300"
                              }`}
                            >
                              <p className="font-bold text-xs uppercase">{coupon.code}</p>
                              <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                                Giảm {coupon.discount_type === "PERCENT" ? `${coupon.discount_value}%` : `${Number(coupon.discount_value).toLocaleString()}₫`}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="border-t border-gray-100 dark:border-slate-700/60 pt-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={usePoints}
                            onChange={(e) => setUsePoints(e.target.checked)}
                            disabled={!profile?.loyalty_points}
                            className="w-4 h-4 text-[#ee4d2d] accent-[#ee4d2d] rounded-xs cursor-pointer"
                          />
                          <div className="flex-1 text-xs">
                            <span className="font-semibold text-gray-800 dark:text-slate-200">Sử dụng điểm tích lũy</span>
                            <span className="text-gray-500 ml-1">
                              (Có <strong className="text-[#ee4d2d]">{profile?.loyalty_points || 0} điểm</strong> = {((profile?.loyalty_points || 0) * (systemSettings?.redeemRate || 100)).toLocaleString()}₫)
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Khối Button điều hướng cuối Form */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-xs font-semibold text-xs uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      disabled={createOrderMutation.isPending || cartItems.length === 0}
                      className="flex-1 bg-[#ee4d2d] hover:bg-[#d03e1e] text-white py-3 px-6 rounded-xs font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {createOrderMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : "ĐẶT HÀNG NGAY"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cột phải: Summary Đơn hàng (Luôn hiển thị ở Step 1 & 2) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-slate-800 border border-black/[0.06] dark:border-slate-700/60 rounded-xs sm:rounded-sm p-5 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)] flex flex-col gap-5 text-gray-900 dark:text-slate-100">
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight border-b border-gray-100 dark:border-slate-700/70 pb-3 flex items-center gap-2">
                  <Package className="text-[#ee4d2d]" size={18} /> Đơn hàng
                </h3>

                <div className="space-y-5">
                  {shopGroups.map((group) => {
                    const shopCouponsList = availableShopCoupons.filter((c: any) => c.shop_id === group.shop?.id);
                    const currentCouponCode = shopCoupons[group.shop?.id] || "";
                    const selectedCoupon = shopCouponsList.find((c: any) => c.code === currentCouponCode);

                    return (
                      <div key={group.shop?.id || "unknown"} className="space-y-3 pb-3 border-b border-gray-100 dark:border-slate-700/60 last:border-0 last:pb-0">
                        <div className="flex items-center gap-1.5 pb-1">
                          <Store className="text-[#ee4d2d] w-4 h-4 shrink-0" />
                          <h4 className="text-xs font-bold uppercase tracking-tight text-[#ee4d2d] truncate">
                            {group.shop?.shop_name || group.shop?.name || "UTEShop Official"}
                          </h4>
                        </div>
                        {group.items.map((item: any) => {
                          const product = item.variant?.product || item.product;
                          const imageUrl = product?.images?.find((img: any) => img.is_primary)?.image_url || product?.images?.[0]?.image_url || "";
                          const unitPrice = item.variant?.sale_price || item.variant?.price || item.unit_price || 0;

                          return (
                            <div key={item.id} className="flex gap-3 items-center">
                              <div className="w-14 h-14 bg-gray-50 dark:bg-slate-900 rounded-xs overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0">
                                <img src={imageUrl.startsWith("http") ? imageUrl : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imageUrl}`} alt={product?.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-grow min-w-0">
                                <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{product?.name}</p>
                                <p className="text-[10px] text-gray-400">{item.variant ? `Size ${item.variant.size} / ${item.variant.color}` : "Mặc định"}</p>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-xs font-bold text-[#ee4d2d]">{Number(unitPrice).toLocaleString()}₫</p>
                                  <p className="text-[10px] text-gray-500 dark:text-slate-400">x{item.quantity}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Dropdown Coupon thuộc về riêng từng Shop chuẩn Shopee */}
                        {shopCouponsList.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between relative">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300">
                              <Ticket size={14} className="text-[#ee4d2d]" />
                              <span>Mã Shop:</span>
                            </div>

                            <div className="relative" ref={openShopCouponDropdownId === group.shop?.id ? dropdownRef : null}>
                              <button
                                type="button"
                                onClick={() => setOpenShopCouponDropdownId(openShopCouponDropdownId === group.shop?.id ? null : group.shop?.id)}
                                className="w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-[#ee4d2d] rounded-xs px-2.5 py-1.5 font-medium text-left text-xs text-gray-800 dark:text-slate-200 flex justify-between items-center transition-colors cursor-pointer shadow-xs"
                              >
                                <span className="truncate">{selectedCoupon ? selectedCoupon.code : "Chọn mã"}</span>
                                <ChevronDown size={13} className={`transform transition-transform ${openShopCouponDropdownId === group.shop?.id ? 'rotate-180 text-[#ee4d2d]' : 'text-gray-400'}`} />
                              </button>

                              {openShopCouponDropdownId === group.shop?.id && (
                                <ul className="absolute right-0 bottom-full mb-1.5 w-56 bg-white dark:bg-slate-800 border border-black/[0.09] dark:border-slate-700 rounded-xs z-50 max-h-48 overflow-y-auto text-xs shadow-[0_2px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-1">
                                  <li
                                    onClick={() => { setShopCoupons(prev => ({ ...prev, [group.shop?.id]: "" })); setOpenShopCouponDropdownId(null); }}
                                    className={`px-3 py-2 rounded-xs cursor-pointer transition-colors ${!currentCouponCode ? 'bg-[#fef0ed] text-[#ee4d2d] font-semibold' : 'hover:bg-gray-50 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-200'}`}
                                  >
                                    Không sử dụng
                                  </li>
                                  {shopCouponsList.map((c: any) => (
                                    <li
                                      key={c.id}
                                      onClick={() => { setShopCoupons(prev => ({ ...prev, [group.shop?.id]: c.code })); setOpenShopCouponDropdownId(null); }}
                                      className={`px-3 py-2 rounded-xs cursor-pointer flex flex-col transition-colors mt-0.5 ${c.code === currentCouponCode ? 'bg-[#fef0ed] text-[#ee4d2d] font-semibold' : 'hover:bg-gray-50 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-200'}`}
                                    >
                                      <span className="font-bold uppercase tracking-wider">{c.code}</span>
                                      <span className="text-[10px] text-gray-500 dark:text-slate-400">Giảm {c.discount_type === 'PERCENT' ? `${c.discount_value}%` : `${Number(c.discount_value).toLocaleString()}₫`}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Khối Tổng tính toán hóa đơn */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-700/70 text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-slate-400">
                    <span>Tạm tính</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">{displaySubtotal.toLocaleString()}₫</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-slate-400">
                      <span>Giảm giá Voucher</span>
                      <span className="text-[#ee4d2d] font-medium">-{discountAmount.toLocaleString()}₫</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-slate-400">
                      <span>Giảm giá Điểm</span>
                      <span className="text-[#ee4d2d] font-medium">-{pointsDiscount.toLocaleString()}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-slate-400">
                    <span>Phí vận chuyển</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{currentShippingFee === 0 ? 'Miễn phí' : `${currentShippingFee.toLocaleString()}₫`}</span>
                  </div>
                  <div className="flex justify-between items-end pt-3 border-t border-gray-100 dark:border-slate-700/70">
                    <span className="text-xs font-bold uppercase text-gray-800 dark:text-slate-200">Tổng thanh toán</span>
                    <span className="text-2xl font-extrabold text-[#ee4d2d]">{displayTotal.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                    <span>Điểm thưởng tích lũy</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{Math.floor(displayTotal / (systemSettings?.earnRate || 10000))} điểm</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider justify-center pt-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Thanh toán an toàn & bảo mật
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
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
            <h1 className="text-5xl font-serif font-black tracking-tighter uppercase text-primary">Đặt hàng thành công!</h1>
            <p className="text-gray-500 font-medium text-lg">Cảm ơn bạn đã mua sắm tại UTEShop. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.</p>
            <div className="flex justify-center gap-4 mt-8">
              <Link to="/orders" className="bg-black text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">Xem đơn hàng</Link>
              <Link to="/" className="bg-white border-2 border-black text-black px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">Tiếp tục mua sắm</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cột trái: Form Thông tin hoặc Phương thức thanh toán */}
            <div className="lg:col-span-8 space-y-6">
              {currentStep === 1 && (
                <div className="card-brutal !p-8 !rounded-[2rem] bg-white border-2 border-black shadow-brutal">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <MapPin className="text-primary" /> Địa chỉ nhận hàng
                    </h3>
                    <button type="button" onClick={handleAddNewAddress} className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter">+ Thêm mới</button>
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
                    <button type="button" onClick={handleNextStep} className="bg-black text-white px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary transition-all">Tiếp tục thanh toán</button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-black shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><MapPin size={20} /></div>
                      <div>
                        <p className="text-xs font-black uppercase text-gray-500">Giao đến</p>
                        <p className="text-sm font-bold truncate max-w-sm">{addresses?.find(a => a.id === selectedAddressId)?.address_line || "Chưa có địa chỉ"}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-[10px] font-black text-primary hover:underline uppercase">Thay đổi</button>
                  </div>

                  {/* Vận chuyển */}
                  <div className="card-brutal !p-8 !rounded-[2rem] bg-white border-2 border-black shadow-brutal">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3"><Truck className="text-primary" /> Phương thức vận chuyển</h3>
                    <label className="relative flex items-center justify-between p-6 bg-primary/5 border-2 border-primary rounded-2xl cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full border border-primary flex items-center justify-center bg-white">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase">Giao hàng tiêu chuẩn</p>
                          <p className="text-xs text-gray-500 font-bold">Dự kiến giao: 2-3 ngày</p>
                        </div>
                      </div>
                      <span className="text-sm font-black">{currentShippingFee.toLocaleString()}₫</span>
                    </label>
                  </div>

                  {/* Thanh toán */}
                  <div className="card-brutal !p-8 !rounded-[2rem] bg-white border-2 border-black shadow-brutal">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3"><CreditCard className="text-primary" /> Phương thức thanh toán</h3>
                    <div className="space-y-4">
                      <button 
                        type="button" 
                        disabled={isCodBlocked}
                        onClick={() => !isCodBlocked && setPaymentMethod("COD")} 
                        className={`w-full flex items-center justify-between p-6 border-2 rounded-2xl transition-all text-left ${isCodBlocked ? 'bg-gray-100 border-black/10 opacity-60 cursor-not-allowed' : paymentMethod === 'COD' ? 'bg-primary/5 border-primary' : 'bg-white border-black/10 hover:border-black'}`}
                      >
                        <div className="flex items-center gap-4">
                          <Wallet size={24} className={isCodBlocked ? 'text-gray-300' : paymentMethod === 'COD' ? 'text-primary' : 'text-gray-400'} />
                          <div>
                            <p className="text-sm font-black uppercase">Thanh toán khi nhận hàng (COD)</p>
                            {isCodBlocked && (
                              <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight mt-1 animate-pulse">
                                Bị khóa tạm thời do bom hàng quá 3 lần trong 1 tháng qua!
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${paymentMethod === 'COD' ? 'border-primary' : 'border-gray-300'}`}>
                          {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                        </div>
                      </button>

                      <button type="button" onClick={() => setPaymentMethod("VNPAY")} className={`w-full flex items-center justify-between p-6 border-2 rounded-2xl transition-all ${paymentMethod === 'VNPAY' ? 'bg-primary/5 border-primary' : 'bg-white border-black/10 hover:border-black'}`}>
                        <div className="flex items-center gap-4">
                          <Landmark size={24} className={paymentMethod === 'VNPAY' ? 'text-primary' : 'text-gray-400'} />
                          <p className="text-sm font-black uppercase">Thanh toán qua VNPAY</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${paymentMethod === 'VNPAY' ? 'border-primary' : 'border-gray-300'}`}>
                          {paymentMethod === 'VNPAY' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Voucher & Điểm tích lũy */}
                  <div className="bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-brutal">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3"><Tag className="text-primary" /> Khuyến mãi & Điểm</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Mã giảm giá sàn</label>
                        <div className="flex gap-2">
                          <input type="text" value={inputCoupon} onChange={(e) => setInputCoupon(e.target.value)} placeholder="Nhập mã voucher..." className="flex-1 bg-gray-50 border-2 border-black/20 rounded-xl px-4 py-3 font-bold uppercase text-sm focus:border-primary outline-none transition-colors" />
                          <button type="button" onClick={handleApplyCoupon} disabled={calculateMutation.isPending} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50">Áp dụng</button>
                        </div>
                        {couponCode && (
                          <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1">
                            <Check size={14} /> Đang áp dụng mã: {couponCode}
                            <button type="button" className="text-red-500 ml-2 hover:underline" onClick={() => { setCouponCode(""); setInputCoupon(""); }}>Hủy</button>
                          </div>
                        )}
                      </div>

                      {platformCoupons.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {platformCoupons.map((coupon: any) => (
                            <button key={coupon.id} type="button" onClick={() => { setInputCoupon(coupon.code); setCouponCode(coupon.code); }} className={`shrink-0 border-2 rounded-xl p-3 text-left transition-all ${couponCode === coupon.code ? "border-primary bg-primary/5" : "border-black/10 hover:border-black"}`}>
                              <p className="font-black text-sm uppercase">{coupon.code}</p>
                              <p className="text-[10px] font-bold text-gray-500">Giảm {coupon.discount_type === "PERCENT" ? `${coupon.discount_value}%` : `${Number(coupon.discount_value).toLocaleString()}₫`}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="border-t border-dashed border-gray-200 pt-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${usePoints ? "bg-primary border-primary text-white" : "border-gray-300 bg-white"}`}>
                            {usePoints && <Check size={16} strokeWidth={4} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black uppercase tracking-tight">Sử dụng điểm tích lũy</p>
                            <p className="text-xs font-bold text-gray-500">Bạn đang có <span className="text-primary">{profile?.loyalty_points || 0} điểm</span> (1 điểm = {(systemSettings?.redeemRate || 100).toLocaleString()}₫)</p>
                          </div>
                          <input type="checkbox" className="hidden" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} disabled={!profile?.loyalty_points} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Khối Button điều hướng cuối Form */}
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setCurrentStep(1)} className="border-2 border-black text-black px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">Quay lại</button>
                    <button type="submit" disabled={createOrderMutation.isPending || cartItems.length === 0} className="flex-1 bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all flex items-center justify-center disabled:opacity-50">
                      {createOrderMutation.isPending ? <Loader2 className="animate-spin" size={24} /> : "ĐẶT HÀNG NGAY"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cột phải: Summary Đơn hàng (Luôn hiển thị ở Step 1 & 2) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-black text-white border-2 border-black rounded-[2.5rem] p-8 shadow-brutal flex flex-col gap-8">
                <h3 className="text-xl font-black uppercase tracking-tighter border-b border-white/20 pb-4 flex items-center gap-3">
                  <Package className="text-primary" /> Đơn hàng
                </h3>

                <div className="space-y-6">
                  {shopGroups.map((group) => {
                    const shopCouponsList = availableShopCoupons.filter((c: any) => c.shop_id === group.shop?.id);
                    const currentCouponCode = shopCoupons[group.shop?.id] || "";
                    const selectedCoupon = shopCouponsList.find((c: any) => c.code === currentCouponCode);

                    return (
                      <div key={group.shop?.id || "unknown"} className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                          <Store className="text-primary w-4 h-4" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">{group.shop?.shop_name || group.shop?.name || "UTEShop Official"}</h4>
                        </div>
                        {group.items.map((item: any) => {
                          const product = item.variant?.product || item.product;
                          const imageUrl = product?.images?.find((img: any) => img.is_primary)?.image_url || product?.images?.[0]?.image_url || "";
                          const unitPrice = item.variant?.sale_price || item.variant?.price || item.unit_price || 0;

                          return (
                            <div key={item.id} className="flex gap-4 items-center pl-2">
                              <div className="w-16 h-20 bg-white/10 rounded-xl overflow-hidden border border-white/20 flex-shrink-0">
                                <img src={imageUrl.startsWith("http") ? imageUrl : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imageUrl}`} alt={product?.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-grow">
                                <p className="text-xs font-black uppercase truncate max-w-[120px] text-white">{product?.name}</p>
                                <p className="text-[10px] font-bold text-gray-400">{item.variant ? `Size ${item.variant.size} / ${item.variant.color}` : "Mặc định"}</p>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-xs font-black text-primary">{Number(unitPrice).toLocaleString()}₫</p>
                                  <p className="text-[10px] font-black text-gray-400">x{item.quantity}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Dropdown Coupon thuộc về riêng từng Shop */}
                        {shopCouponsList.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between relative">
                            <div className="flex items-center gap-2">
                              <Ticket size={16} className="text-primary" />
                              <span className="text-xs font-bold text-gray-400 uppercase">Mã của Shop</span>
                            </div>

                            <div className="relative" ref={openShopCouponDropdownId === group.shop?.id ? dropdownRef : null}>
                              <button type="button" onClick={() => setOpenShopCouponDropdownId(openShopCouponDropdownId === group.shop?.id ? null : group.shop?.id)} className="w-40 bg-[#1a1a1a] border-2 border-white/20 rounded-xl px-3 py-2 font-bold text-left text-white flex justify-between items-center text-xs">
                                <span className="truncate">{selectedCoupon ? selectedCoupon.code : "Chọn mã"}</span>
                                <ChevronDown size={14} className={`transform transition-transform ${openShopCouponDropdownId === group.shop?.id ? 'rotate-180' : 'text-gray-400'}`} />
                              </button>

                              {openShopCouponDropdownId === group.shop?.id && (
                                <ul className="absolute right-0 bottom-full mb-2 w-56 bg-black border-2 border-white/20 rounded-xl z-50 max-h-48 overflow-y-auto text-white shadow-xl">
                                  <li onClick={() => { setShopCoupons(prev => ({ ...prev, [group.shop?.id]: "" })); setOpenShopCouponDropdownId(null); }} className={`px-3 py-2 text-xs cursor-pointer ${!currentCouponCode ? 'bg-primary' : 'hover:bg-white/10'}`}>Không sử dụng</li>
                                  {shopCouponsList.map((c: any) => (
                                    <li key={c.id} onClick={() => { setShopCoupons(prev => ({ ...prev, [group.shop?.id]: c.code })); setOpenShopCouponDropdownId(null); }} className={`px-3 py-2 text-xs cursor-pointer flex flex-col ${c.code === currentCouponCode ? 'bg-primary' : 'hover:bg-white/10'}`}>
                                      <span className="font-black uppercase">{c.code}</span>
                                      <span className="text-[9px] text-gray-400">Giảm {c.discount_type === 'PERCENT' ? `${c.discount_value}%` : `${Number(c.discount_value).toLocaleString()}₫`}</span>
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
                <div className="space-y-4 pt-6 border-t border-white/10">
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>TẠM TÍNH</span>
                    <span className="text-white">{displaySubtotal.toLocaleString()}₫</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>GIẢM GIÁ (VOUCHER)</span>
                      <span className="text-red-400">-{discountAmount.toLocaleString()}₫</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>GIẢM GIÁ (ĐIỂM)</span>
                      <span className="text-red-400">-{pointsDiscount.toLocaleString()}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>VẬN CHUYỂN</span>
                    <span className="text-green-400">{currentShippingFee === 0 ? 'Miễn phí' : `${currentShippingFee.toLocaleString()}₫`}</span>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-white/5">
                    <span className="text-xs font-black uppercase tracking-widest">TỔNG CỘNG</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">{displayTotal.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2">
                    <span>Điểm thưởng nhận được</span>
                    <span className="text-green-500">+{Math.floor(displayTotal / (systemSettings?.earnRate || 10000))} điểm</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest justify-center">
                  <ShieldCheck size={14} className="text-green-500" /> Thanh toán được bảo mật
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
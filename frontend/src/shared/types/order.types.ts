import { Product, ProductVariant } from "./product.types";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "FAILED"
  | "RETURN_PENDING"
  | "RETURNED"
  | "COMPLETED";

export type PaymentMethod = "COD" | "VNPAY" | "MOMO";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_variant_id: number | null;
  product_name?: string;
  product_image_url?: string;
  variant_color?: string;
  variant_size?: string;
  color?: string;
  size?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface OrderStatusLog {
  id: number;
  order_id: number;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  subtotal?: number;
  discount_amount: number;
  shipping_fee: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  statusLogs?: OrderStatusLog[];
  reviews?: any[];
  returnRequests?: any[];
  shop?: { id: number; name: string; avatar_url?: string; shop_name?: string };
  shop_order_code?: string;
  order_code?: string;
  parentOrder?: {
    id: number;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    shipping_address: string;
    note: string | null;
  };
  parent_order_id?: number;
  points_used?: number;
  points_earned?: number;
  final_amount?: number;
  delivery_attempts?: number;
}

export interface CreateOrderPayload {
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  addressId?: number;
  note?: string;
  paymentMethod: PaymentMethod;
  platformCouponCode?: string;
  shopCoupons?: Record<string, string>;
  usePoints?: boolean;
  is_cart_checkout?: boolean;
  items?: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    unit_price: number;
    cart_item_id?: number;
  }[];
}

export interface OrderListResponse {
  total: number;
  totalPages: number;
  currentPage: number;
  orders: Order[];
}

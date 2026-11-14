import { Product, ProductVariant } from "./product.types";

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  product_variant_id: number | null;
  quantity: number;
  unit_price: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}

export interface AddToCartPayload {
  productId: number;
  variantId?: number;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface UpdateCartItemPayload {
  quantity?: number;
  product_variant_id?: number;
  newVariantId?: number;
}

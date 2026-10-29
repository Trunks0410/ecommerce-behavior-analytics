import { Cart, AddToCartPayload, UpdateCartItemPayload, CartItem } from "@/shared/types/cart.types";
import { axiosClient } from "@/shared/api/axiosClient";
import { store } from "@/app/stores/store";

const GUEST_CART_KEY = "guest_cart";

const getGuestCartItems = (): CartItem[] => {
  const data = localStorage.getItem(GUEST_CART_KEY);
  return data ? JSON.parse(data) : [];
};

const saveGuestCartItems = (items: CartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

const isAuth = () => {
  return store.getState().auth.isAuthenticated;
};

export const cartService = {
  getCart: async (): Promise<Cart> => {
    if (isAuth()) {
      const response = await axiosClient.get("/cart");
      return response.data.data as Cart;
    } else {
      const items = getGuestCartItems();
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      return {
        id: 0,
        user_id: 0,
        items,
        totalItems,
        totalAmount
      };
    }
  },

  addItem: async (payload: AddToCartPayload) => {
    if (isAuth()) {
      const response = await axiosClient.post("/cart/items", payload);
      return response.data.data;
    } else {
      const items = getGuestCartItems();
      let unit_price = 0;
      
      if (payload.variant && payload.variant.price !== null) {
        unit_price = payload.variant.price;
      } else if (payload.product) {
        unit_price = payload.product.sale_price || payload.product.price;
      }

      const existingItemIndex = items.findIndex(
        i => i.product_id === payload.productId && i.product_variant_id === (payload.variantId || null)
      );

      if (existingItemIndex >= 0) {
        items[existingItemIndex].quantity += payload.quantity;
      } else {
        const newItem: CartItem = {
          id: Date.now(),
          cart_id: 0,
          product_id: payload.productId,
          product_variant_id: payload.variantId || null,
          quantity: payload.quantity,
          unit_price,
          product: payload.product,
          variant: payload.variant
        };
        items.push(newItem);
      }

      saveGuestCartItems(items);
      return { message: "Added to guest cart" };
    }
  },

  updateItem: async (itemId: number, payload: UpdateCartItemPayload) => {
    if (isAuth()) {
      const response = await axiosClient.put(`/cart/items/${itemId}`, payload);
      return response.data.data;
    } else {
      let items = getGuestCartItems();
      const itemIndex = items.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        if (payload.product_variant_id !== undefined && payload.product_variant_id !== items[itemIndex].product_variant_id) {
            const product = items[itemIndex].product;
            const newVariant = product?.variants?.find(v => v.id === payload.product_variant_id);
            const existingSameVariantIndex = items.findIndex(i => i.product_id === items[itemIndex].product_id && i.product_variant_id === payload.product_variant_id && i.id !== itemId);
            
            if (existingSameVariantIndex >= 0) {
                items[existingSameVariantIndex].quantity += (payload.quantity || items[itemIndex].quantity);
                items.splice(itemIndex, 1);
            } else {
                items[itemIndex].product_variant_id = payload.product_variant_id;
                items[itemIndex].variant = newVariant;
                if (newVariant && newVariant.price !== null) {
                   items[itemIndex].unit_price = newVariant.price;
                }
                if (payload.quantity !== undefined) {
                  items[itemIndex].quantity = payload.quantity;
                }
            }
        } else if (payload.quantity !== undefined) {
          items[itemIndex].quantity = payload.quantity;
        }
        saveGuestCartItems(items);
      }
      return { message: "Updated guest cart" };
    }
  },

  removeItem: async (itemId: number) => {
    if (isAuth()) {
      const response = await axiosClient.delete(`/cart/items/${itemId}`);
      return response.data.message;
    } else {
      let items = getGuestCartItems();
      items = items.filter(i => i.id !== itemId);
      saveGuestCartItems(items);
      return "Removed from guest cart";
    }
  },

  clearCart: async () => {
    if (isAuth()) {
      const response = await axiosClient.delete("/cart");
      return response.data.message;
    } else {
      saveGuestCartItems([]);
      return "Cleared guest cart";
    }
  },
  
  syncGuestCart: async (accessToken?: string) => {
    const items = getGuestCartItems();
    if (items.length === 0) return;
    
    for (const item of items) {
      try {
        const config = accessToken ? {
          headers: { Authorization: `Bearer ${accessToken}` }
        } : undefined;
        
        await axiosClient.post("/cart/items", {
          productId: item.product_id,
          variantId: item.product_variant_id,
          quantity: item.quantity
        }, config);
      } catch (error) {
        console.error("Failed to sync cart item", error);
      }
    }
    saveGuestCartItems([]);
  }
};

export default cartService;

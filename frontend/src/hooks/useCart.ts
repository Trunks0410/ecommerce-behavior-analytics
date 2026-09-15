import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import cartService from "@/services/cartService";
import { AddToCartPayload, UpdateCartItemPayload } from "@/shared/types/cart.types";
import { useAppDispatch } from "@/app/stores/hooks";
import { setCartCount } from "@/app/stores/slices/cartSlice";
import { useEffect } from "react";

import { useAppSelector } from "@/app/stores/hooks";

export const useCart = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const queryInfo = useQuery({
    queryKey: ["cart", isAuthenticated],
    queryFn: cartService.getCart,
  });

  useEffect(() => {
    if (queryInfo.data) {
      dispatch(setCartCount(queryInfo.data.totalItems));
    }
  }, [queryInfo.data, dispatch]);

  return queryInfo;
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddToCartPayload) => cartService.addItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: UpdateCartItemPayload }) =>
      cartService.updateItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => cartService.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

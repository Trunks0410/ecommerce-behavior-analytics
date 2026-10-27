import { ProductFilters } from "@/shared/types/product.types";
import { useQuery } from "@tanstack/react-query";
import productService from "@/services/productService";

export const useProducts = (filter: ProductFilters) => {
  return useQuery({
    queryKey: ["products", filter],
    queryFn: () => productService.getProducts(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useProductDetail = (slug: string) => {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => productService.getProductBySlug(slug),
    enabled: !!slug,
    retry: 1,
  });
};

export const useFeaturedProducts = (limit: number) => {
  return useQuery({
    queryKey: ["featured-products", limit],
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useNewestProducts = (limit: number) => {
  return useQuery({
    queryKey: ["newest-products", limit],
    queryFn: () => productService.getNewestProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useBestSellerProducts = (limit: number) => {
  return useQuery({
    queryKey: ["best-seller-products", limit],
    queryFn: () => productService.getBestSellerProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useMostViewedProducts = (limit: number) => {
  return useQuery({
    queryKey: ["most-viewed-products", limit],
    queryFn: () => productService.getMostViewedProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useSimilarProducts = (slug: string) => {
  return useQuery({
    queryKey: ["similar-products", slug],
    queryFn: () => productService.getSimilarProducts(slug),
    enabled: !!slug,
    retry: 1,
  });
};

import { categoryService } from "@/services/categoryService";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAllCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => productService.toggleFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
};

export const useRecordView = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => productService.recordView(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viewed-products"] });
    },
  });
};

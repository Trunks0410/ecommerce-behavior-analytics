import { ProductFilters } from "@/shared/types/product.types";
import { useQuery } from "@tanstack/react-query";
import productService from "@/services/productService";
import { useLanguage } from "@/shared/context/LanguageContext";

export const useProducts = (filter: ProductFilters) => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["products", filter, language],
    queryFn: () => productService.getProducts(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useProductDetail = (slug: string) => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["product", slug, language],
    queryFn: () => productService.getProductBySlug(slug),
    enabled: !!slug,
    retry: 1,
  });
};

export const useFeaturedProducts = (limit: number = 10) => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["featured-products", limit, language],
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useNewestProducts = (limit: number = 10) => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["newest-products", limit, language],
    queryFn: () => productService.getNewestProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useBestSellerProducts = (limit: number = 10) => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["best-seller-products", limit, language],
    queryFn: () => productService.getBestSellerProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useMostViewedProducts = (limit: number = 10) => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["most-viewed-products", limit, language],
    queryFn: () => productService.getMostViewedProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useSimilarProducts = (slug: string) => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["similar-products", slug, language],
    queryFn: () => productService.getSimilarProducts(slug),
    enabled: !!slug,
    retry: 1,
  });
};

import { categoryService } from "@/services/categoryService";

export const useCategories = () => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["categories", language],
    queryFn: () => categoryService.getAllCategories(),
    staleTime: 5 * 60 * 1000,
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

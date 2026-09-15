import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import reviewService from "@/services/reviewService";

export const useProductReviews = (productId: number, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["product-reviews", productId, page, limit],
    queryFn: () => reviewService.getProductReviews(productId, page, limit),
    enabled: !!productId,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: number; payload: any }) =>
      reviewService.createReview(productId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product-reviews", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["product", variables.productId],
      });
    },
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: number; payload: any }) =>
      reviewService.updateReview(productId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product-reviews", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["product", variables.productId],
      });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
    },
  });
};

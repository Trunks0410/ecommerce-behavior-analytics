import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import returnService from "@/services/returnService";
import { CreateReturnPayload } from "@/shared/types/return.types";
import { toast } from "sonner";

export const useMyReturnRequests = (page = 1, limit = 10, status = "ALL") => {
  return useQuery({
    queryKey: ["my-returns", page, limit, status],
    queryFn: () => returnService.getMyReturnRequests(page, limit, status),
  });
};

export const useReturnRequestDetail = (id: number) => {
  return useQuery({
    queryKey: ["return-detail", id],
    queryFn: () => returnService.getReturnRequestDetail(id),
    enabled: !!id,
  });
};

export const useCreateReturnRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateReturnPayload) => returnService.createReturnRequest(payload),
    onSuccess: (data, variables) => {
      toast.success("Đã gửi yêu cầu trả hàng thành công");
      queryClient.invalidateQueries({ queryKey: ["my-returns"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderCounts"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.shopOrderId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi tạo yêu cầu trả hàng");
    },
  });
};

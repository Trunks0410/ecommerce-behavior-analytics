import { ReturnListResponse, ReturnRequest, CreateReturnPayload } from "@/shared/types/return.types";
import { axiosClient } from "@/shared/api/axiosClient";

const returnService = {
  getMyReturnRequests: async (page = 1, limit = 10, status = "ALL") => {
    const response = await axiosClient.get("/returns", { params: { page, limit, status } });
    return response.data.data as ReturnListResponse;
  },

  getReturnRequestDetail: async (id: number) => {
    const response = await axiosClient.get(`/returns/${id}`);
    return response.data.data as ReturnRequest;
  },

  createReturnRequest: async (payload: CreateReturnPayload) => {
    const response = await axiosClient.post("/returns", payload);
    return response.data.data as ReturnRequest;
  },
};

export default returnService;

import { Address, CreateAddressPayload, UpdateAddressPayload } from "@/shared/types/address.types";
import { axiosClient } from "@/shared/api/axiosClient";

const addressService = {
  getMyAddresses: async () => {
    const response = await axiosClient.get("/addresses");
    return response.data.data as Address[];
  },

  createAddress: async (payload: CreateAddressPayload) => {
    const response = await axiosClient.post("/addresses", payload);
    return response.data.data as Address;
  },

  updateAddress: async (id: number, payload: UpdateAddressPayload) => {
    const response = await axiosClient.put(`/addresses/${id}`, payload);
    return response.data.data as Address;
  },

  deleteAddress: async (id: number) => {
    const response = await axiosClient.delete(`/addresses/${id}`);
    return response.data.message;
  },
};

export default addressService;

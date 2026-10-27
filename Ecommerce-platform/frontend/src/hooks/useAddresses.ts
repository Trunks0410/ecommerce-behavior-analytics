import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import addressService from "@/services/addressService";
import { CreateAddressPayload, UpdateAddressPayload } from "@/shared/types/address.types";

export const useAddresses = () => {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: addressService.getMyAddresses,
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAddressPayload) => addressService.createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAddressPayload }) =>
      addressService.updateAddress(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => addressService.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

import { useQuery } from "@tanstack/react-query";
import { systemService } from "@/services/systemService";

export const useSystemSettings = (options?: any) => {
  return useQuery({
    queryKey: ["system-settings"],
    queryFn: () => systemService.getPublicSettings().then((res) => res.data.data),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (rarely changes)
    ...options,
  });
};

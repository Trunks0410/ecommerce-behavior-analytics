import { axiosClient } from "@/shared/api/axiosClient";

export type SystemSettings = {
  earnRate: number;
  redeemRate: number;
};

export const systemService = {
  getPublicSettings: () =>
    axiosClient.get<{ message: string; data: SystemSettings }>("/system/settings/public"),
};

import { publicAxios } from "@/shared/api/axiosClient";
import type { Category } from "@/shared/types/category.types";

export const categoryService = {
  getAllCategories: async () => {
    const response = await publicAxios.get("/categories");
    return response.data.data as Category[];
  },
};

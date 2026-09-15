export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryResponse {
  data: Category[];
}

export interface ParentCategory {
  id: number;
  name: string;
  slug: string;
}

export interface SubCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

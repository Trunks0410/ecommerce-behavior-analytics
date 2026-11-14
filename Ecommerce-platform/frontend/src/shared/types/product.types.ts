import { Category } from "./category.types";

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
}

export interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

export interface ProductVariant {
  id: number;
  sku: string;
  color: string;
  color_hex?: string;
  size: string;
  price: number | null;
  sale_price?: number | null;
  image_url?: string | null;
  stock_quantity: number;
  product?: Product;
}

export interface ProductAttribute {
  id: number;
  attr_name: string;
  attr_value: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  sold_count: number;
  is_new: boolean;
  is_featured: boolean;
  material?: string;
  description?: string;
  gender: "MALE" | "FEMALE" | "UNISEX";
  category: Category;
  brand?: Brand;
  images?: ProductImage[];
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  totalStock?: number; // Được Backend tính toán trả về trong chi tiết
  view_count: number;
  rating_average?: number | string;
  review_count?: number;
  created_at: string;
  shop_id?: number;
  shop?: Shop;
}

export interface Shop {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  cover_url?: string;
  rating: number | string;
  followers_count: number;
  response_rate: number;
  productsCount?: number;
  reviewsCount?: number;
  created_at?: string;
}

export interface ProductListResponse {
  total: number;
  totalPages: number;
  currentPage: number;
  products: Product[];
}

export interface ProductFilters {
  keyword?: string;
  categorySlug?: string;
  brandId?: number;
  gender?: string;
  minPrice?: number;
  maxPrice?: number;
  isNew?: boolean;
  isFeatured?: boolean | string;
  sortBy?:
    | "newest"
    | "price_asc"
    | "price_desc"
    | "best_sellers"
    | "most_viewed";
  page?: number;
  limit?: number;
}

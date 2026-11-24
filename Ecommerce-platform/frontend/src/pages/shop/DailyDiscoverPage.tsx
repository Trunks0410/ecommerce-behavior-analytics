import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, Store, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/shared/components/ui/ProductCard";
import {
  useRecommendedProducts,
  useFeaturedProducts,
  useBestSellerProducts,
  useCategories,
  useProducts,
} from "@/hooks/useProducts";
import { useLanguage } from "@/shared/context/LanguageContext";

const ITEMS_PER_PAGE = 24;

const DailyDiscoverPage = () => {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const { data: categoryList = [] } = useCategories();
  const { data: personalizedProducts = [], isLoading: isLoadingPersonalized } =
    useRecommendedProducts(96);
  const { data: featuredProducts = [] } = useFeaturedProducts(24);
  const { data: bestSellers = [] } = useBestSellerProducts(24);

  // Khi chọn 1 danh mục cụ thể, lấy toàn bộ sản phẩm thuộc danh mục đó
  const { data: categoryProductsRes, isLoading: isLoadingCategory } = useProducts({
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    limit: 100,
    page: 1,
  });

  const allDiscoverProducts = useMemo(() => {
    const combined = [
      ...personalizedProducts,
      ...featuredProducts,
      ...bestSellers,
    ];
    return Array.from(
      new Map(combined.map((p: any) => [p.id || p.slug, p])).values()
    );
  }, [personalizedProducts, featuredProducts, bestSellers]);

  const activeProducts = useMemo(() => {
    if (selectedCategory !== "all") {
      return categoryProductsRes?.products || [];
    }
    return allDiscoverProducts;
  }, [selectedCategory, categoryProductsRes, allDiscoverProducts]);

  // Sản phẩm liên quan trong cùng các Shop của danh mục/gợi ý hiện tại
  const relatedShopProducts = useMemo(() => {
    const sourceList = activeProducts.length > 0 ? activeProducts : allDiscoverProducts;
    const shopIds = new Set(
      sourceList.map((p: any) => p.shop_id || p.shop?.id).filter(Boolean)
    );
    const activeIds = new Set(activeProducts.map((p: any) => p.id));

    if (shopIds.size === 0) return [];

    const pool = [...allDiscoverProducts, ...featuredProducts, ...bestSellers];
    const uniquePool = Array.from(
      new Map(pool.map((p: any) => [p.id || p.slug, p])).values()
    );

    return uniquePool
      .filter((p: any) => {
        const sId = p.shop_id || p.shop?.id;
        return sId && shopIds.has(sId) && !activeIds.has(p.id);
      })
      .slice(0, 12);
  }, [activeProducts, allDiscoverProducts, featuredProducts, bestSellers]);

  const totalPages = Math.max(1, Math.ceil(activeProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProducts = activeProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isLoading =
    selectedCategory !== "all"
      ? isLoadingCategory
      : isLoadingPersonalized && allDiscoverProducts.length === 0;

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Clean Shopee-style Daily Discover Header */}
        <div className="bg-white dark:bg-slate-900 rounded-t-xl border-b-4 border-[#ee4d2d] px-6 py-4 shadow-xs text-center">
          <h1 className="text-lg sm:text-xl font-bold text-[#ee4d2d] uppercase tracking-wide flex items-center justify-center gap-2">
            <Sparkles size={20} />
            <span>{t("daily_suggestions") || (isEn ? "DAILY DISCOVER" : "GỢI Ý HÔM NAY")}</span>
          </h1>
        </div>

        {/* Category Filter Tabs (Shopee-style) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-gray-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => handleCategoryChange("all")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#ee4d2d] text-white shadow-xs"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-[#fef0ed] hover:text-[#ee4d2d]"
              }`}
            >
              {isEn ? "All Categories" : "Tất cả danh mục"}
            </button>
            {categoryList.map((cat: any) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.slug
                    ? "bg-[#ee4d2d] text-white shadow-xs"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-[#fef0ed] hover:text-[#ee4d2d]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin text-[#ee4d2d] mb-3" size={36} />
            <p className="text-sm font-medium">
              {isEn ? "Loading recommendations..." : "Đang tải gợi ý hôm nay..."}
            </p>
          </div>
        ) : (
          <>
            {pagedProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {pagedProducts.map((product: any) => (
                  <ProductCard
                    key={`discover-${product.id}`}
                    id={product.slug || String(product.id)}
                    name={product.name}
                    price={Number(product.sale_price || product.price)}
                    originalPrice={
                      product.sale_price ? Number(product.price) : undefined
                    }
                    image={
                      product.images?.[0]?.image_url ||
                      product.thumbnail ||
                      "/placeholder.jpg"
                    }
                    category={product.category?.name || "MeeMart"}
                    rating={Number(product.rating || product.average_rating || 4.8)}
                    sales={Number(product.sold_count || product.sales_count || 65)}
                    badge={product.badge || undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                {isEn
                  ? "No products found in this category."
                  : "Chưa có sản phẩm nào trong danh mục này."}
              </div>
            )}

            {/* Numbered Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  type="button"
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage === 1}
                  className="w-9 h-9 rounded-md flex items-center justify-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-9 h-9 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                        pageNum === safePage
                          ? "bg-[#ee4d2d] text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#ee4d2d] hover:text-[#ee4d2d]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handlePageChange(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="w-9 h-9 rounded-md flex items-center justify-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label="Trang tiếp"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Sản phẩm liên quan từ cùng Gian hàng (Shop) */}
            {relatedShopProducts.length > 0 && (
              <div className="pt-8 space-y-4">
                <div className="flex items-center justify-between border-b-2 border-[#ee4d2d] pb-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#ee4d2d] uppercase tracking-tight flex items-center gap-2">
                    <Store size={18} />
                    <span>
                      {isEn
                        ? "Related Products from Same Shops"
                        : "Sản phẩm liên quan trong cùng Gian hàng"}
                    </span>
                  </h2>
                  <Link
                    to="/products"
                    className="text-xs font-semibold text-[#ee4d2d] hover:underline flex items-center gap-0.5"
                  >
                    <span>{isEn ? "Explore more" : "Khám phá thêm"}</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {relatedShopProducts.map((product: any) => (
                    <ProductCard
                      key={`related-shop-${product.id}`}
                      id={product.slug || String(product.id)}
                      name={product.name}
                      price={Number(product.sale_price || product.price)}
                      originalPrice={
                        product.sale_price ? Number(product.price) : undefined
                      }
                      image={
                        product.images?.[0]?.image_url ||
                        product.thumbnail ||
                        "/placeholder.jpg"
                      }
                      category={product.category?.name || "MeeMart"}
                      rating={Number(product.rating || product.average_rating || 4.8)}
                      sales={Number(product.sold_count || product.sales_count || 65)}
                      badge={product.badge || undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DailyDiscoverPage;

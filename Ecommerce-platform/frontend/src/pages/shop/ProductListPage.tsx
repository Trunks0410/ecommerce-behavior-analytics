import ProductCard from "@/shared/components/ui/ProductCard";
import { ShopeeSelect } from "@/shared/components/ui/Dropdown";
import {
  ChevronDown,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Tag,
  Search,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Check,
  Camera,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useLanguage } from "@/shared/context/LanguageContext";
import { VisualSearchModal } from "@/shared/components/modals/VisualSearchModal";

const ProductListPage = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewType, setViewType] = useState<"grid" | "list">("grid");

  // Lấy các tham số lọc từ URL Search Params
  const page = Number(searchParams.get("page")) || 1;
  const keyword = searchParams.get("keyword") || "";
  const categorySlug = searchParams.get("category") || "";
  const brandId = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : undefined;
  const gender = searchParams.get("gender") || "";
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const isFeatured = searchParams.get("isFeatured");
  const isNew = searchParams.get("isNew");
  const inStock = searchParams.get("inStock") === "true";
  const minRating = Number(searchParams.get("minRating") || 0);
  const sortBy = searchParams.get("sort") || "newest";

  // Trạng thái local cho các ô nhập liệu
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice?.toString() || "");
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice?.toString() || "");

  // Visual Search state (Shopee & TikTok Shop)
  const isVisualSearch = searchParams.get("visualSearch") === "1";
  const [visualSearchImage, setVisualSearchImage] = useState<string | null>(null);
  const [visualSearchData, setVisualSearchData] = useState<any>(null);
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  const getPaginationRange = (currentPage: number, totalPages: number, siblingCount = 1) => {
    const totalPageNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "...", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [firstPageIndex, "...", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
    }

    return [];
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = Number(jumpPageInput);
    if (data && targetPage >= 1 && targetPage <= data.totalPages) {
      updateFilters({ page: targetPage });
      setJumpPageInput("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isVisualSearch) {
      const img = sessionStorage.getItem("last_visual_search_image");
      const dataRaw = sessionStorage.getItem("last_visual_search_data");
      setVisualSearchImage(img);
      if (dataRaw) {
        try {
          setVisualSearchData(JSON.parse(dataRaw));
        } catch (e) {
          console.error("Lỗi parse visual search data:", e);
        }
      }
    } else {
      setVisualSearchImage(null);
      setVisualSearchData(null);
    }
  }, [isVisualSearch]);

  const handleClearVisualSearch = () => {
    sessionStorage.removeItem("last_visual_search_image");
    sessionStorage.removeItem("last_visual_search_data");
    setVisualSearchImage(null);
    setVisualSearchData(null);
    updateFilters({ visualSearch: "" });
  };

  // Đồng bộ local state khi URL thay đổi
  useEffect(() => {
    setLocalKeyword(keyword);
  }, [keyword]);

  useEffect(() => {
    setLocalMinPrice(minPrice?.toString() || "");
  }, [minPrice]);

  useEffect(() => {
    setLocalMaxPrice(maxPrice?.toString() || "");
  }, [maxPrice]);

  // Gọi API lấy danh mục
  const { data: categories } = useCategories();

  // Gọi API lấy sản phẩm
  const { data, isLoading } = useProducts({
    page,
    keyword,
    categorySlug: categorySlug || undefined,
    brandId,
    gender: gender || undefined,
    minPrice,
    maxPrice,
    isFeatured: isFeatured || undefined,
    isNew: isNew === "true" ? true : undefined,
    sortBy: sortBy as any,
    limit: 15, // Hiển thị 15 sản phẩm mỗi trang (3 hàng x 5 cột cân đối theo chuẩn Shopee)
  });

  const updateFilters = (newParams: Record<string, string | number | undefined | null>) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set("page", "1");

      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === null || val === "") {
          nextParams.delete(key);
        } else {
          nextParams.set(key, val.toString());
        }
      });
      return nextParams;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ keyword: localKeyword });
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      minPrice: localMinPrice ? Number(localMinPrice) : "",
      maxPrice: localMaxPrice ? Number(localMaxPrice) : "",
    });
  };

  const handleClearFilters = () => {
    sessionStorage.removeItem("last_visual_search_image");
    sessionStorage.removeItem("last_visual_search_data");
    setVisualSearchImage(null);
    setVisualSearchData(null);
    setSearchParams({});
    setLocalKeyword("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
  };

  const activeCategoryName = isVisualSearch
    ? t("visual_search_title")
    : categorySlug
    ? categories?.find((c) => c.slug === categorySlug)?.name
    : t("products_all");

  const sourceProducts = (isVisualSearch && visualSearchData?.products && visualSearchData.products.length > 0)
    ? visualSearchData.products
    : (data?.products ?? []);

  const visibleProducts = sourceProducts.filter((product: any) => {
    if (inStock) {
      const variantTotal = product.variants?.reduce((sum: number, variant: any) => sum + Number(variant.stock_quantity || 0), 0) || 0;
      const productStock = Number(product.stock_quantity ?? variantTotal ?? 0);
      if (productStock <= 0) return false;
    }

    if (minRating > 0) {
      const rating = Number(product.rating_average || 0);
      if (rating < minRating) return false;
    }

    return true;
  });

  const totalDisplayCount = isVisualSearch && visualSearchData?.products
    ? visualSearchData.products.length
    : (data?.total || 0);

  const quickPriceOptions = [
    { label: t("filter_price_under_200k"), min: 0, max: 200000 },
    { label: t("filter_price_200k_500k"), min: 200000, max: 500000 },
    { label: t("filter_price_500k_1m"), min: 500000, max: 1000000 },
    { label: t("filter_price_over_1m"), min: 1000000, max: 999999999 },
  ];

  const ratingOptions = [
    { label: "4.0+", value: 4 },
    { label: "4.5+", value: 4.5 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* 1. BREADCRUMBS */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link to="/" className="hover:text-[#ee4d2d] transition-colors flex items-center gap-1 font-medium">
          {t("breadcrumb_home")}
        </Link>
        <ChevronRight size={13} className="text-gray-400" />
        <Link
          to="/products"
          className={!categorySlug ? "text-[#ee4d2d] font-bold" : "hover:text-[#ee4d2d] transition-colors font-medium"}
        >
          {t("breadcrumb_products")}
        </Link>
        {categorySlug && (
          <>
            <ChevronRight size={13} className="text-gray-400" />
            <span className="text-[#ee4d2d] font-bold truncate max-w-xs">{activeCategoryName}</span>
          </>
        )}
      </nav>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 2. SIDEBAR BỘ LỌC (SHOPEE STYLE) */}
        <aside className="lg:w-64 shrink-0 space-y-5">
          <div className="bg-white dark:bg-slate-800 border border-black/[0.06] dark:border-slate-700/60 rounded-xs sm:rounded-sm p-4 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)] space-y-5">
            {/* Header bộ lọc */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700/70">
              <h2 className="font-bold text-xs sm:text-sm uppercase tracking-tight flex items-center gap-2 text-gray-900 dark:text-slate-100">
                <SlidersHorizontal size={15} className="text-[#ee4d2d]" />
                {t("filter_title")}
              </h2>
              <button
                onClick={handleClearFilters}
                className="text-xs text-gray-400 hover:text-[#ee4d2d] transition-colors flex items-center gap-1 cursor-pointer font-medium"
                title={t("filter_clear")}
              >
                <RotateCcw size={13} />
                <span>{t("filter_clear")}</span>
              </button>
            </div>

            {/* Tìm kiếm theo từ khóa */}
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                {t("filter_keyword")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("filter_search_placeholder")}
                  value={localKeyword}
                  onChange={(e) => setLocalKeyword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:border-[#ee4d2d] focus:ring-1 focus:ring-[#ee4d2d] transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#ee4d2d] transition-colors cursor-pointer"
                >
                  <Search size={14} />
                </button>
              </div>
            </form>

            {/* Bộ lọc nhanh */}
            <div className="space-y-3 rounded-2xl border border-[#f3dfd7] bg-[#fffaf8] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ee4d2d]">{t("filter_quick")}</p>
                  <h3 className="mt-1 text-sm font-black text-slate-900">{t("filter_popular")}</h3>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "isFeatured", label: t("filter_deal"), active: isFeatured === "true" },
                    { key: "isNew", label: t("filter_new"), active: isNew === "true" },
                    { key: "inStock", label: t("filter_in_stock"), active: inStock },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.key === "isFeatured") updateFilters({ isFeatured: isFeatured === "true" ? "" : "true" });
                        if (item.key === "isNew") updateFilters({ isNew: isNew === "true" ? "" : "true" });
                        if (item.key === "inStock") updateFilters({ inStock: inStock ? "" : "true" });
                      }}
                      className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
                        item.active
                          ? "border-[#ee4d2d] bg-[#fff1ee] text-[#ee4d2d]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#ee4d2d]/40 hover:text-[#ee4d2d]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{t("filter_rating")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ratingOptions.map((option) => {
                      const active = minRating === option.value;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => updateFilters({ minRating: active ? "" : option.value })}
                          className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
                            active
                              ? "border-[#ee4d2d] bg-[#fff1ee] text-[#ee4d2d]"
                              : "border-slate-200 bg-white text-slate-600 hover:border-[#ee4d2d]/40 hover:text-[#ee4d2d]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Danh mục sản phẩm */}
            <div className="space-y-3 rounded-2xl border border-[#f3dfd7] bg-[#fffaf8] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ee4d2d]">
                    {t("filter_category")}
                  </p>
                  <h3 className="mt-1 text-sm font-black text-slate-900">
                    {t("filter_category_explore")}
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => updateFilters({ category: "" })}
                  className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                    !categorySlug
                      ? "border-[#ee4d2d] bg-[#ee4d2d] text-white shadow-[0_12px_24px_rgba(238,77,45,0.18)]"
                      : "border-[#f2e7e2] bg-white text-slate-700 hover:border-[#ee4d2d]/40 hover:text-[#ee4d2d]"
                  }`}
                >
                  <span>{t("filter_all_categories")}</span>
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      !categorySlug ? "bg-white/20 text-white" : "bg-[#fff1ee] text-[#ee4d2d]"
                    }`}
                  >
                    {!categorySlug ? "✓" : "•"}
                  </span>
                </button>

                {categories &&
                  (() => {
                    const roots = categories.filter((c) => c.parent_id === null || c.parent_id === undefined);
                    return roots.map((root) => {
                      const children = categories.filter((c) => c.parent_id === root.id);
                      const isRootActive = categorySlug === root.slug;

                      return (
                        <div key={root.id} className="rounded-xl border border-[#f5e6e1] bg-white p-2 shadow-sm">
                          <button
                            onClick={() => updateFilters({ category: root.slug })}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-all duration-200 ${
                              isRootActive
                                ? "bg-[#fff2ee] text-[#ee4d2d]"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <span className="truncate">{root.name}</span>
                          </button>

                          {children.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                              {children.map((child) => {
                                const isChildActive = categorySlug === child.slug;
                                return (
                                  <button
                                    key={child.id}
                                    onClick={() => updateFilters({ category: child.slug })}
                                    className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                                      isChildActive
                                        ? "border-[#ee4d2d] bg-[#fff1ee] text-[#ee4d2d] shadow-sm"
                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#ee4d2d]/40 hover:text-[#ee4d2d]"
                                    }`}
                                  >
                                    {child.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
              </div>
            </div>

            {/* Lọc khoảng giá */}
            <form onSubmit={handlePriceSubmit} className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                {t("filter_price")}
              </h3>

              <div className="flex flex-wrap gap-1.5">
                {quickPriceOptions.map((option) => {
                  const isActive =
                    minPrice === option.min && maxPrice === option.max;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setLocalMinPrice(String(option.min));
                        setLocalMaxPrice(String(option.max === 999999999 ? "" : option.max));
                        updateFilters({
                          minPrice: option.min,
                          maxPrice: option.max === 999999999 ? "" : option.max,
                        });
                      }}
                      className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
                        isActive
                          ? "border-[#ee4d2d] bg-[#fff1ee] text-[#ee4d2d]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#ee4d2d]/40 hover:text-[#ee4d2d]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder={t("filter_price_from")}
                    value={localMinPrice}
                    onChange={(e) => setLocalMinPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:border-[#ee4d2d]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₫</span>
                </div>
                <span className="text-xs text-gray-400">—</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder={t("filter_price_to")}
                    value={localMaxPrice}
                    onChange={(e) => setLocalMaxPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:border-[#ee4d2d]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₫</span>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {t("filter_apply")}
              </button>
            </form>

            {/* Bộ sưu tập nổi bật */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-slate-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                {t("filter_collection")}
              </h3>
              <div className="space-y-1.5">
                {[
                  { id: "featured", name: t("collection_featured"), param: "isFeatured", value: "true" },
                  { id: "new", name: t("collection_new"), param: "isNew", value: "true" },
                  { id: "most_viewed", name: t("collection_most_viewed"), param: "sort", value: "most_viewed" },
                ].map((item) => {
                  let isChecked = false;
                  if (item.param === "isFeatured") isChecked = isFeatured === "true";
                  if (item.param === "isNew") isChecked = isNew === "true";
                  if (item.param === "sort") isChecked = sortBy === "most_viewed";

                  return (
                    <div
                      key={item.id}
                      onClick={() => updateFilters({ [item.param]: isChecked ? "" : item.value })}
                      className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer group py-0.5"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-[#ee4d2d] border-[#ee4d2d] text-white"
                            : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover:border-[#ee4d2d]"
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className={`group-hover:text-[#ee4d2d] transition-colors ${isChecked ? "text-[#ee4d2d] font-bold" : ""}`}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nút reset */}
            <button
              onClick={handleClearFilters}
              className="w-full py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500 text-gray-600 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>{t("filter_clear")}</span>
            </button>
          </div>

          {/* Banner Ưu đãi bên lề */}
          <div className="bg-gradient-to-br from-[#ee4d2d] to-[#f57224] text-white p-5 rounded-xl shadow-sm relative overflow-hidden group">
            <div className="relative z-10 space-y-2">
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white">
                <Sparkles size={11} /> {t("filter_promo_title")}
              </span>
              <h4 className="text-sm font-bold text-white leading-snug">
                {t("filter_promo_desc")}
              </h4>
              <p className="text-[11px] text-white/90">Áp dụng tự động tại bước thanh toán cho tất cả đơn hàng.</p>
            </div>
            <div className="absolute -right-4 -bottom-4 text-7xl font-black opacity-15 rotate-12 select-none pointer-events-none">
              %
            </div>
          </div>
        </aside>

        {/* 3. KHU VỰC DANH SÁCH SẢN PHẨM */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* Visual AI Search Banner (Shopee & TikTok Shop Style) */}
          {isVisualSearch && (
            <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 dark:from-red-950/40 dark:via-orange-950/30 dark:to-amber-950/20 border-2 border-[#ee4d2d]/30 dark:border-[#ee4d2d]/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm backdrop-blur-xs">
              <div className="flex items-center gap-4">
                {visualSearchImage ? (
                  <div className="relative group shrink-0">
                    <img
                      src={visualSearchImage}
                      alt="Ảnh tìm kiếm"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-[#ee4d2d] shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-[#ee4d2d] text-white p-1 rounded-full shadow-xs">
                      <Camera size={12} />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#fef0ed] dark:bg-slate-800 rounded-lg border-2 border-dashed border-[#ee4d2d] flex items-center justify-center text-[#ee4d2d] shrink-0">
                    <Camera size={24} />
                  </div>
                )}

                <div className="space-y-1">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles size={14} className="text-[#ee4d2d]" />
                    <span>{t("visual_search_results_title")}</span>
                  </h2>
                  {(visualSearchData?.visualFeatures || visualSearchData?.queryFeatures) && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <span>{t("visual_search_color_label")}:</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-slate-600 shadow-xs inline-block"
                          style={{
                            backgroundColor:
                              visualSearchData.visualFeatures?.dominantColorHex ||
                              visualSearchData.queryFeatures?.dominantColor?.hex ||
                              "#ee4d2d",
                          }}
                        />
                        <strong className="text-gray-900 dark:text-slate-100">
                          {visualSearchData.visualFeatures?.dominantColor ||
                            visualSearchData.queryFeatures?.dominantColor?.colorName ||
                            t("visual_search_auto_detected")}
                        </strong>
                      </span>
                      {(visualSearchData.visualFeatures?.smartTags ||
                        visualSearchData.queryFeatures?.categoryKeywords)?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{t("visual_search_features_title")}:</span>
                          <strong className="text-gray-900 dark:text-slate-100">
                            {(
                              visualSearchData.visualFeatures?.smartTags ||
                              visualSearchData.queryFeatures?.categoryKeywords
                            ).join(", ")}
                          </strong>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVisualModalOpen(true)}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Camera size={14} className="text-[#ee4d2d]" />
                  <span>{t("visual_search_change_image")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearVisualSearch}
                  className="px-3.5 py-2 bg-[#fef0ed] dark:bg-red-950/40 hover:bg-red-100 text-[#ee4d2d] dark:text-red-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title={t("visual_search_exit")}
                >
                  <X size={14} />
                  <span>{t("visual_search_exit")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Thanh công cụ Top Bar chuẩn Shopee */}
          <div className="bg-white dark:bg-slate-800 border border-black/[0.06] dark:border-slate-700/60 rounded-xs sm:rounded-sm p-3.5 sm:p-4 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <span>{t("products_shop_title")}</span>
                <span className="text-[#ee4d2d] font-extrabold">/ {activeCategoryName}</span>
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {t("products_found")}: <strong className="text-gray-900 dark:text-slate-100">{totalDisplayCount}</strong> {t("products_count_unit")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium hidden sm:inline">
                {t("sort_by")}
              </span>

              {/* Nút Tab Sắp xếp Shopee */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => updateFilters({ sort: "newest" })}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                    sortBy === "newest"
                      ? "bg-[#ee4d2d] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {t("sort_newest")}
                </button>

                <button
                  type="button"
                  onClick={() => updateFilters({ sort: "best_sellers" })}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                    sortBy === "best_sellers"
                      ? "bg-[#ee4d2d] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {t("sort_best_sellers")}
                </button>

                <button
                  type="button"
                  onClick={() => updateFilters({ sort: "most_viewed" })}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                    sortBy === "most_viewed"
                      ? "bg-[#ee4d2d] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {t("sort_most_viewed")}
                </button>

                {/* Dropdown sắp xếp theo Giá */}
                <ShopeeSelect
                  value={sortBy.startsWith("price_") ? sortBy : ""}
                  onChange={(val) => updateFilters({ sort: val })}
                  placeholder="Giá"
                  size="sm"
                  menuWidth="w-44"
                  align="right"
                  buttonClassName={sortBy.startsWith("price_") ? "border-[#ee4d2d] text-[#ee4d2d] font-medium" : ""}
                  options={[
                    { value: "price_asc", label: t("sort_price_asc") },
                    { value: "price_desc", label: t("sort_price_desc") },
                  ]}
                />
              </div>

              {/* Chuyển view Grid / List */}
              <div className="flex bg-gray-100 dark:bg-slate-900 p-0.5 rounded-xs border border-gray-200 dark:border-slate-700 ml-1">
                <button
                  type="button"
                  onClick={() => setViewType("grid")}
                  className={`p-1.5 rounded-xs transition-all cursor-pointer ${
                    viewType === "grid"
                      ? "bg-white dark:bg-slate-800 text-[#ee4d2d] shadow-xs"
                      : "text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewType("list")}
                  className={`p-1.5 rounded-xs transition-all cursor-pointer ${
                    viewType === "list"
                      ? "bg-white dark:bg-slate-800 text-[#ee4d2d] shadow-xs"
                      : "text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}
                  title="List View"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Lưới sản phẩm */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} className="aspect-[3/4] bg-gray-200 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700/60" />
              ))}
            </div>
          ) : !data || visibleProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/70 rounded-2xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
                {t("no_products_found")}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {t("no_products_desc")}
              </p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>{t("filter_clear")}</span>
              </button>
            </div>
          ) : (
            <div
              className={
                viewType === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5"
                  : "flex flex-col space-y-3"
              }
            >
              {visibleProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  id={product.slug || String(product.id)}
                  name={product.name}
                  price={Number(product.sale_price || product.price)}
                  originalPrice={product.sale_price ? Number(product.price) : undefined}
                  image={product.images?.[0]?.image_url || product.primary_image || "/placeholder.jpg"}
                  category={product.category?.name || "MeeMart"}
                  rating={Number(product.rating_average || 4.8)}
                  sales={Number(product.sold_count || 12)}
                  layout={viewType}
                  badge={
                    (product.similarity_score ?? product.similarityScore)
                      ? t("visual_search_similarity_badge").replace("{score}", String(product.similarity_score ?? product.similarityScore))
                      : product.is_new
                      ? t("badge_new_arrival")
                      : product.sold_count > 15
                      ? t("badge_best_seller")
                      : undefined
                  }
                  shop={product.shop}
                />
              ))}
            </div>
          )}

          {/* Phân trang chuẩn Shopee (Pagination with Ellipsis & Jump-to-Page) */}
          {data && data.totalPages > 1 && (
            <div className="pt-8 pb-4 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-6">
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Nút lùi 1 trang */}
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    updateFilters({ page: page - 1 });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 flex items-center justify-center hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Danh sách trang rút gọn với dấu ... */}
                {getPaginationRange(page, data.totalPages).map((item, idx) => {
                  if (item === "...") {
                    const isLeftDots = idx === 1;
                    const jumpTarget = isLeftDots
                      ? Math.max(1, page - 5)
                      : Math.min(data.totalPages, page + 5);
                    return (
                      <button
                        key={`dots-${idx}`}
                        type="button"
                        onClick={() => {
                          updateFilters({ page: jumpTarget });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-9 h-9 rounded-lg text-slate-400 dark:text-slate-500 hover:text-[#ee4d2d] font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                        title={isLeftDots ? "Lùi 5 trang" : "Tiến 5 trang"}
                      >
                        •••
                      </button>
                    );
                  }

                  const p = Number(item);
                  const isActive = p === page;
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        updateFilters({ page: p });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-9 h-9 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#ee4d2d] text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#ee4d2d] hover:text-[#ee4d2d]"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                {/* Nút tiến 1 trang */}
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => {
                    updateFilters({ page: page + 1 });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 flex items-center justify-center hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Trang kế tiếp"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Nhập trang muốn đến trực tiếp */}
              <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Đến trang</span>
                <input
                  type="number"
                  min={1}
                  max={data.totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder={String(page)}
                  className="w-14 h-9 px-2 text-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs focus:outline-none focus:border-[#ee4d2d]"
                />
                <button
                  type="submit"
                  disabled={!jumpPageInput || Number(jumpPageInput) < 1 || Number(jumpPageInput) > data.totalPages}
                  className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-[#ee4d2d] text-slate-600 hover:text-white dark:bg-slate-800 dark:text-slate-300 font-bold text-xs border border-gray-200 dark:border-slate-700 hover:border-[#ee4d2d] transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Đi
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Visual Search Modal */}
      <VisualSearchModal
        isOpen={isVisualModalOpen}
        onClose={() => setIsVisualModalOpen(false)}
      />
    </div>
  );
};

export default ProductListPage;

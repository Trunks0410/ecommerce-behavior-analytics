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
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useLanguage } from "@/shared/context/LanguageContext";

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
  const sortBy = searchParams.get("sort") || "newest";

  // Trạng thái local cho các ô nhập liệu
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice?.toString() || "");
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice?.toString() || "");

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
    limit: 12, // Hiển thị 12 sản phẩm mỗi trang cho lưới cân đối
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
    setSearchParams({});
    setLocalKeyword("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
  };

  const activeCategoryName = categorySlug
    ? categories?.find((c) => c.slug === categorySlug)?.name
    : t("products_all");

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
        <aside className="lg:w-72 shrink-0 space-y-5">
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

            {/* Danh mục sản phẩm */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                {t("filter_category")}
              </h3>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                <button
                  onClick={() => updateFilters({ category: "" })}
                  className={`w-full text-left text-xs py-1.5 px-2.5 rounded-lg transition-colors font-medium flex items-center justify-between ${
                    !categorySlug
                      ? "bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] font-bold"
                      : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                  }`}
                >
                  <span>{t("filter_all_categories")}</span>
                  {!categorySlug && <Check size={13} />}
                </button>

                {categories &&
                  (() => {
                    const roots = categories.filter((c) => c.parent_id === null || c.parent_id === undefined);
                    return roots.map((root) => {
                      const children = categories.filter((c) => c.parent_id === root.id);
                      const isRootActive = categorySlug === root.slug;
                      return (
                        <div key={root.id} className="space-y-0.5 pt-0.5">
                          <button
                            onClick={() => updateFilters({ category: root.slug })}
                            className={`w-full text-left text-xs py-1.5 px-2.5 rounded-lg transition-colors font-semibold flex items-center justify-between ${
                              isRootActive
                                ? "bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] font-bold"
                                : "text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                            }`}
                          >
                            <span className="truncate">{root.name}</span>
                            {isRootActive && <Check size={13} />}
                          </button>

                          {children.map((child) => {
                            const isChildActive = categorySlug === child.slug;
                            return (
                              <button
                                key={child.id}
                                onClick={() => updateFilters({ category: child.slug })}
                                className={`w-full text-left text-[11px] py-1 pl-5 pr-2.5 rounded-lg transition-colors flex items-center justify-between ${
                                  isChildActive
                                    ? "text-[#ee4d2d] font-bold bg-[#fef0ed]/60 dark:bg-[#ee4d2d]/10"
                                    : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                                }`}
                              >
                                <span className="truncate">• {child.name}</span>
                                {isChildActive && <Check size={11} />}
                              </button>
                            );
                          })}
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

            {/* Giới tính */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-slate-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                {t("filter_gender")}
              </h3>
              <div className="space-y-1.5">
                {[
                  { id: "MALE", label: t("gender_men") },
                  { id: "FEMALE", label: t("gender_women") },
                  { id: "UNISEX", label: t("gender_unisex") },
                ].map((g) => {
                  const isChecked = gender === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => updateFilters({ gender: isChecked ? "" : g.id })}
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
                        {g.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

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
        <main className="flex-1 space-y-5">
          {/* Thanh công cụ Top Bar chuẩn Shopee */}
          <div className="bg-white dark:bg-slate-800 border border-black/[0.06] dark:border-slate-700/60 rounded-xs sm:rounded-sm p-3.5 sm:p-4 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <span>{t("products_shop_title")}</span>
                <span className="text-[#ee4d2d] font-extrabold">/ {activeCategoryName}</span>
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {t("products_found")}: <strong className="text-gray-900 dark:text-slate-100">{data?.total || 0}</strong> {t("products_count_unit")}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="aspect-[3/4] bg-gray-200 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/60" />
              ))}
            </div>
          ) : !data || data.products.length === 0 ? (
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
              className={`grid gap-3 sm:gap-4 ${
                viewType === "grid"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4"
                  : "grid-cols-1"
              }`}
            >
              {data.products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.slug || String(product.id)}
                  name={product.name}
                  price={Number(product.sale_price || product.price)}
                  originalPrice={product.sale_price ? Number(product.price) : undefined}
                  image={product.images?.[0]?.image_url || "/placeholder.jpg"}
                  category={product.category?.name || "MeeMart"}
                  rating={Number(product.rating_average || 4.8)}
                  sales={Number(product.sold_count || 12)}
                  badge={product.is_new ? t("badge_new_arrival") : product.sold_count > 15 ? t("badge_best_seller") : undefined}
                  shop={product.shop}
                />
              ))}
            </div>
          )}

          {/* Phân trang (Pagination) */}
          {data && data.totalPages > 1 && (
            <div className="pt-6 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateFilters({ page: page - 1 })}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 flex items-center justify-center hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: data.totalPages }).map((_, i) => {
                  const p = i + 1;
                  const isActive = p === page;
                  return (
                    <button
                      key={p}
                      onClick={() => updateFilters({ page: p })}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#ee4d2d] text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#ee4d2d] hover:text-[#ee4d2d]"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page >= data.totalPages}
                onClick={() => updateFilters({ page: page + 1 })}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 flex items-center justify-center hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Trang kế tiếp"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductListPage;

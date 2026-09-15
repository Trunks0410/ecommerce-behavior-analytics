import ProductCard from "@/shared/components/ui/ProductCard";
import { ChevronDown, LayoutGrid, List, SlidersHorizontal, ChevronLeft, ChevronRight, Tag, Search, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProducts, useCategories } from "@/hooks/useProducts";

const ProductListPage = () => {
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

  // Trạng thái local cho các ô nhập liệu (tránh giật lag khi gõ)
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice?.toString() || "");
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice?.toString() || "");

  // Đồng bộ local state khi URL thay đổi (như khi bấm clear filter)
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
    limit: 9, // Hiển thị 9 sản phẩm mỗi trang cho khớp lưới 3 cột
  });



  const updateFilters = (newParams: Record<string, string | number | undefined | null>) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      // Reset về trang 1 khi đổi bộ lọc
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] mb-12 text-gray-400">
        <Link to="/" className="hover:text-primary transition-colors">TRANG CHỦ</Link>
        <span className="text-black">/</span>
        <span className="text-black">SẢN PHẨM</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="lg:w-80 shrink-0 space-y-12">
          <div className="bg-white border-2 border-black p-8 rounded-3xl shadow-brutal space-y-12">
            <div className="flex justify-between items-center pb-2 border-b-2 border-black">
              <h2 className="font-serif font-black text-2xl uppercase tracking-tighter flex items-center gap-3">
                <SlidersHorizontal size={24} /> BỘ LỌC
              </h2>
              <button
                onClick={handleClearFilters}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Dọn bộ lọc"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* 0. Tìm kiếm theo từ khoá */}
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <h3 className="font-black text-xs uppercase tracking-widest border-b-2 border-black pb-2">Từ khoá</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm sản phẩm..."
                  value={localKeyword}
                  onChange={(e) => setLocalKeyword(e.target.value)}
                  className="input-modern w-full pr-10 text-xs h-11"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-black">
                  <Search size={16} />
                </button>
              </div>
            </form>

            {/* 1. Giới tính */}
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest mb-6 border-b-2 border-black pb-2">Giới tính</h3>
              <div className="space-y-4">
                {["MALE", "FEMALE", "UNISEX"].map((g) => {
                  const displayMap: Record<string, string> = {
                    MALE: "Nam",
                    FEMALE: "Nữ",
                    UNISEX: "Unisex",
                  };
                  const isChecked = gender === g;
                  return (
                    <div 
                      key={g} 
                      onClick={() => updateFilters({ gender: gender === g ? "" : g })}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-5 h-5 rounded-md border-2 border-black flex items-center justify-center transition-all bg-white group-hover:border-primary">
                        <div className={"w-2.5 h-2.5 bg-primary rounded-sm transition-all " + (isChecked ? "opacity-100 scale-100" : "opacity-0 scale-50")}></div>
                      </div>
                      <span className={"text-sm font-bold transition-colors " + (isChecked ? "text-primary font-black" : "group-hover:text-primary")}>
                        {displayMap[g]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Danh mục đệ quy cha-con */}
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest mb-6 border-b-2 border-black pb-2">Danh mục</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 border-2 border-black p-3 bg-gray-50 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <button
                  onClick={() => updateFilters({ category: "" })}
                  className={"w-full text-left text-xs py-1.5 px-3 border-2 transition-all font-bold uppercase tracking-wider " + (
                    !categorySlug
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-transparent hover:border-black"
                  )}
                >
                  Tất cả danh mục
                </button>

                {categories && (() => {
                  const roots = categories.filter((c) => c.parent_id === null || c.parent_id === undefined);
                  return roots.map((root) => {
                    const children = categories.filter((c) => c.parent_id === root.id);
                    return (
                      <div key={root.id} className="flex flex-col gap-1 mt-2 first:mt-0">
                        <button
                          onClick={() => updateFilters({ category: root.slug })}
                          className={"text-left text-xs py-1.5 px-3 border-2 transition-all font-black uppercase tracking-wide " + (
                            categorySlug === root.slug
                              ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              : "bg-gray-200 text-black border-transparent hover:border-black"
                          )}
                        >
                          {root.name}
                        </button>

                        {children.map((child) => {
                          const grandchildren = categories.filter((c) => c.parent_id === child.id);
                          return (
                            <div key={child.id} className="flex flex-col gap-1 pl-3">
                              <button
                                onClick={() => updateFilters({ category: child.slug })}
                                className={"text-left text-[11px] py-1 px-2 border-2 transition-all font-bold " + (
                                  categorySlug === child.slug
                                    ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    : "bg-white text-gray-600 border-transparent hover:border-black"
                                )}
                              >
                                — {child.name}
                              </button>

                              {grandchildren.map((gchild) => (
                                <button
                                  key={gchild.id}
                                  onClick={() => updateFilters({ category: gchild.slug })}
                                  className={"text-left text-[10px] py-0.5 pl-6 pr-2 border-2 transition-all font-semibold " + (
                                    categorySlug === gchild.slug
                                      ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                      : "bg-white text-gray-500 border-transparent hover:border-black"
                                  )}
                                >
                                  • {gchild.name}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* 3. Lọc khoảng giá */}
            <form onSubmit={handlePriceSubmit} className="space-y-4">
              <h3 className="font-black text-xs uppercase tracking-widest border-b-2 border-black pb-2">Khoảng giá</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      placeholder="Từ"
                      value={localMinPrice}
                      onChange={(e) => setLocalMinPrice(e.target.value)}
                      className="input-modern w-full text-xs py-2 h-10 pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">₫</span>
                  </div>
                  <span className="font-black text-gray-300">—</span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      placeholder="Đến"
                      value={localMaxPrice}
                      onChange={(e) => setLocalMaxPrice(e.target.value)}
                      className="input-modern w-full text-xs py-2 h-10 pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">₫</span>
                  </div>
                </div>
                <button type="submit" className="btn-modern w-full text-xs uppercase tracking-widest h-12">
                  LỌC GIÁ
                </button>
              </div>
            </form>



            {/* 5. Bộ sưu tập */}
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest mb-6 border-b-2 border-black pb-2">Bộ sưu tập</h3>
              <div className="space-y-4">
                {[
                  { id: "featured", name: "Nổi bật", param: "isFeatured", value: "true" },
                  { id: "new", name: "Hàng mới về", param: "isNew", value: "true" },
                  { id: "most_viewed", name: "Được quan tâm nhất", param: "sort", value: "most_viewed" }
                ].map((item) => {
                  let isChecked = false;
                  if (item.param === "isFeatured") isChecked = isFeatured === "true";
                  if (item.param === "isNew") isChecked = isNew === "true";
                  if (item.param === "sort") isChecked = sortBy === "most_viewed";

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => updateFilters({ [item.param]: isChecked ? "" : item.value })}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-5 h-5 rounded-md border-2 border-black flex items-center justify-center transition-all bg-white group-hover:border-primary">
                        <div className={"w-2.5 h-2.5 bg-primary rounded-sm transition-all " + (isChecked ? "opacity-100 scale-100" : "opacity-0 scale-50")}></div>
                      </div>
                      <span className={"text-sm font-bold transition-colors " + (isChecked ? "text-primary font-black" : "group-hover:text-primary")}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleClearFilters} 
              className="btn-modern-secondary w-full mt-4 text-xs uppercase tracking-widest h-14 hover:bg-red-500 hover:text-white transition-all"
            >
                DỌN BỘ LỌC
            </button>
          </div>

          {/* Promo Card in Sidebar */}
          <div className="bg-primary text-white p-8 rounded-3xl shadow-brutal border-2 border-black relative overflow-hidden group">
             <div className="relative z-10">
                <Tag className="mb-4" />
                <h4 className="text-2xl font-serif font-black uppercase tracking-tighter mb-4 leading-tight">Ưu đãi đặc biệt khi mua combo</h4>
                <p className="text-sm font-bold opacity-80 mb-8 leading-relaxed">Giảm thêm 10% khi mua từ 3 sản phẩm bất kỳ.</p>
                <button className="px-6 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-subtle active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">Mua ngay</button>
             </div>
             <div className="absolute -right-8 -bottom-8 text-[12rem] font-black opacity-10 rotate-12 group-hover:rotate-0 transition-all duration-700 select-none">%</div>
          </div>
        </aside>

        {/* Product Listing Area */}
        <main className="flex-1">
          {/* Top Bar Banner */}
          <div className="bg-white border-2 border-black rounded-2xl p-10 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-brutal relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-5xl font-serif font-black mb-3 tracking-tighter uppercase">
                Cửa hàng <span className="text-primary underline italic">{categorySlug ? categories?.find(c => c.slug === categorySlug)?.name : "Tất cả"}</span>
              </h1>
              <p className="text-xs text-gray-400 font-black uppercase tracking-widest">
                Tìm thấy <span className="text-black">{data ? data.total : 0}</span> thiết kế độc bản
              </p>
            </div>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="flex bg-gray-50 p-1.5 rounded-2xl border-2 border-black shadow-subtle">
                <button 
                  onClick={() => setViewType("grid")}
                  className={"p-3 rounded-2xl transition-all active:scale-95 " + (viewType === "grid" ? "bg-black text-white shadow-subtle" : "text-gray-400 hover:text-primary hover:bg-primary/5")}
                >
                  <LayoutGrid size={20} />
                </button>
                <button 
                   onClick={() => setViewType("list")}
                   className={"p-3 rounded-2xl transition-all active:scale-95 " + (viewType === "list" ? "bg-black text-white shadow-subtle" : "text-gray-400 hover:text-primary hover:bg-primary/5")}
                >
                  <List size={20} />
                </button>
              </div>
              
              {/* Dropdown sắp xếp cực chất */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="appearance-none btn-brutal-secondary h-16 pl-8 pr-12 text-xs font-black uppercase tracking-widest shadow-subtle hover:shadow-none cursor-pointer focus:outline-none bg-white border-2 border-black rounded-2xl"
                >
                  <option value="newest">MỚI NHẤT</option>
                  <option value="price_asc">GIÁ TĂNG DẦN</option>
                  <option value="price_desc">GIÁ GIẢM DẦN</option>
                  <option value="best_sellers">BÁN CHẠY NHẤT</option>
                  <option value="most_viewed">ĐƯỢC QUAN TÂM</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-primary/5 -skew-x-12 translate-x-20"></div>
          </div>

          {/* Product Grid / List rendering */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="aspect-[3/4] bg-gray-200 border-2 border-black rounded-2xl shadow-subtle"></div>
              ))}
            </div>
          ) : !data || data.products.length === 0 ? (
            <div className="border-2 border-dashed border-black rounded-3xl p-16 text-center space-y-4 bg-white">
              <h3 className="text-2xl font-serif font-black uppercase">Không tìm thấy sản phẩm</h3>
              <p className="text-gray-400 font-bold text-sm">Vui lòng chọn dọn bộ lọc hoặc thử lại từ khóa khác.</p>
              <button onClick={handleClearFilters} className="btn-modern px-8 py-3 text-xs uppercase tracking-widest">Dọn bộ lọc</button>
            </div>
          ) : (
            <div className={"grid gap-12 " + (viewType === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
              {data.products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.slug}
                  name={product.name}
                  price={product.sale_price || product.price}
                  originalPrice={product.sale_price ? product.price : undefined}
                  image={product.images?.[0]?.image_url || "/placeholder.jpg"}
                  category={product.category?.name || "Danh mục"}
                  rating={product.rating_average || 0}
                  sales={product.sold_count}
                  badge={product.is_new ? "Mới" : product.sold_count > 15 ? "Hot" : undefined}
                  shop={product.shop}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-20 flex items-center justify-center gap-6">
              <button
                disabled={page <= 1}
                onClick={() => updateFilters({ page: page - 1 })}
                className="w-14 h-14 rounded-2xl border-2 border-black flex items-center justify-center bg-white shadow-subtle hover:bg-primary hover:text-white transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
              
              <div className="flex gap-3">
                {Array.from({ length: data.totalPages }).map((_, i) => {
                  const p = i + 1;
                  const isActive = p === page;
                  return (
                    <button
                      key={p}
                      onClick={() => updateFilters({ page: p })}
                      className={"w-14 h-14 rounded-2xl border-2 border-black font-black text-lg transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none " + (
                        isActive
                          ? "bg-black text-white shadow-subtle"
                          : "bg-white hover:bg-primary hover:text-white shadow-subtle"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page >= data.totalPages}
                onClick={() => updateFilters({ page: page + 1 })}
                className="w-14 h-14 rounded-2xl border-2 border-black flex items-center justify-center bg-white shadow-subtle hover:bg-primary hover:text-white transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight size={24} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductListPage;

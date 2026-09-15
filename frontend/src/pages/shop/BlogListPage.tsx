import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Calendar, User, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import managerService from "@/services/managerService";

export const BlogListPage = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const data = await managerService.getBlogs({
        category: selectedCategory || undefined,
        search: search || undefined,
      });
      setBlogs(data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách bài viết:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBlogs();
  };

  // Get unique categories list from blogs for filtering options
  const allCategories = Array.from(new Set(blogs.map((b) => b.category)));

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-12 pb-24 px-6 md:px-12 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Page Header Title */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="bg-primary text-black border-2 border-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] inline-block shadow-subtle">
            Trang Tin Tức & Xu Hướng
          </span>
          <h1 className="font-serif text-5xl font-black uppercase tracking-tight text-black">
            UTEShop Blog
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
            Khám phá xu hướng thời trang mới nhất, hướng dẫn phối đồ và tin tức sự kiện khuyến mãi toàn sàn.
          </p>
        </div>

        {/* Filters and Search row */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white border-2 border-black rounded-[2rem] p-6 shadow-brutal">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-4 py-2 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                selectedCategory === ""
                  ? "bg-black text-white"
                  : "bg-gray-50 hover:bg-gray-100 text-black"
              }`}
            >
              Tất cả
            </button>
            {allCategories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedCategory === cat
                    ? "bg-black text-white"
                    : "bg-gray-50 hover:bg-gray-100 text-black"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-2 border-black rounded-xl py-2 pl-4 pr-10 text-xs font-bold focus:outline-none"
            />
            <button type="submit" className="absolute right-3 top-3 text-gray-400 hover:text-black">
              <Search size={16} />
            </button>
          </form>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center py-32 bg-white border-2 border-black rounded-[2.5rem]">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : blogs.length === 0 ? (
          // Empty State
          <div className="text-center py-24 bg-white border-2 border-black rounded-[2.5rem] shadow-sm">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="font-serif text-2xl font-black uppercase">Chưa có bài viết nào</h3>
            <p className="text-gray-400 font-semibold text-xs mt-2">
              Vui lòng quay lại sau hoặc thử từ khóa tìm kiếm khác.
            </p>
          </div>
        ) : (
          // Blogs Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                className="bg-white border-2 border-black rounded-[2rem] overflow-hidden shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex flex-col h-[28rem]"
              >
                {/* Thumbnail image */}
                <div className="h-48 border-b-2 border-black overflow-hidden relative bg-gray-100 shrink-0">
                  {blog.thumbnail_url ? (
                    <img
                      src={blog.thumbnail_url}
                      alt={blog.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-gray-300 text-lg uppercase bg-gradient-to-br from-gray-100 to-gray-200">
                      UTEShop Blog
                    </div>
                  )}
                  <span className="absolute top-4 left-4 bg-purple-100 text-purple-700 border border-purple-200 text-[8px] font-black uppercase px-2.5 py-1 rounded-md shadow-subtle select-none">
                    {blog.category}
                  </span>
                </div>

                {/* Content body */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-[9px] font-bold text-gray-400 uppercase">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />{" "}
                        {new Date(blog.created_at).toLocaleDateString("vi-VN")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={10} /> {blog.views_count} lượt xem
                      </span>
                    </div>

                    <h2 className="font-serif text-lg font-black uppercase text-black line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {blog.title}
                    </h2>

                    <p className="text-xs text-gray-500 font-semibold line-clamp-3 leading-relaxed">
                      {blog.summary || "Bấm xem chi tiết bài viết để tìm hiểu thêm..."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                      <User size={12} className="text-gray-400" />
                      {blog.author?.profile?.full_name || "Manager"}
                    </span>
                    <Link
                      to={`/blogs/${blog.slug}`}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-black hover:text-primary transition-colors"
                    >
                      Đọc bài <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Calendar, User, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import managerService from "@/services/managerService";
import { useLanguage } from "@/shared/context/LanguageContext";

export const BlogListPage = () => {
  const { language, t } = useLanguage();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const fetchBlogs = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const data = await managerService.getBlogs({
        category: selectedCategory || undefined,
        search: search || undefined,
      });
      setBlogs(data || []);
    } catch (err) {
      console.error("Failed to load blog posts:", err);
      setHasError(true);
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
  const locale = language === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="min-h-screen bg-[#F4F4F0] px-6 pt-12 pb-24 text-slate-900 animate-in fade-in duration-300 dark:bg-slate-950 dark:text-slate-100 md:px-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Page Header Title */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="inline-block rounded-full border-2 border-black bg-primary px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-black shadow-subtle dark:border-primary">
            {t("blog_news_trends")}
          </span>
          <h1 className="font-serif text-5xl font-black uppercase tracking-tight text-black dark:text-slate-100">
            MeeMart Blog
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-gray-500 dark:text-slate-400">
            {t("blog_intro")}
          </p>
        </div>

        {/* Filters and Search row */}
        <div className="flex flex-col items-stretch justify-between gap-4 rounded-[2rem] border-2 border-black bg-white p-6 shadow-brutal dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setSelectedCategory("")}
              className={`rounded-xl border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                selectedCategory === ""
                  ? "border-black bg-black text-white dark:border-primary dark:bg-primary dark:text-black"
                  : "border-black bg-gray-50 text-black hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t("blog_all_categories")}
            </button>
            {allCategories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  selectedCategory === cat
                    ? "border-black bg-black text-white dark:border-primary dark:bg-primary dark:text-black"
                    : "border-black bg-gray-50 text-black hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
              aria-label={t("blog_search")}
              placeholder={t("blog_search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-black bg-gray-50 py-2 pl-4 pr-10 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
            <button type="submit" aria-label={t("blog_search")} className="absolute right-3 top-3 text-gray-400 hover:text-black dark:hover:text-white">
              <Search size={16} />
            </button>
          </form>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center rounded-[2.5rem] border-2 border-black bg-white py-32 dark:border-slate-700 dark:bg-slate-900">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : hasError ? (
          <div className="rounded-[2.5rem] border-2 border-black bg-white py-24 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">{t("blog_load_error")}</p>
            <button
              type="button"
              onClick={fetchBlogs}
              className="mt-4 rounded-xl border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-primary hover:text-black dark:border-primary dark:bg-primary dark:text-black"
            >
              {t("blog_retry")}
            </button>
          </div>
        ) : blogs.length === 0 ? (
          // Empty State
          <div className="rounded-[2.5rem] border-2 border-black bg-white py-24 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="font-serif text-2xl font-black uppercase text-slate-900 dark:text-slate-100">{t("blog_no_posts")}</h3>
            <p className="mt-2 text-xs font-semibold text-gray-400 dark:text-slate-400">
              {t("blog_no_posts_desc")}
            </p>
          </div>
        ) : (
          // Blogs Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                className="flex h-[28rem] flex-col overflow-hidden rounded-[2rem] border-2 border-black bg-white shadow-brutal transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none dark:border-slate-700 dark:bg-slate-900"
              >
                {/* Thumbnail image */}
                <div className="relative h-48 shrink-0 overflow-hidden border-b-2 border-black bg-gray-100 dark:border-slate-700 dark:bg-slate-800">
                  {blog.thumbnail_url ? (
                    <img
                      src={blog.thumbnail_url}
                      alt={blog.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-lg font-black uppercase text-gray-300 dark:from-slate-800 dark:to-slate-700 dark:text-slate-500">
                      MeeMart Blog
                    </div>
                  )}
                  <span className="absolute top-4 left-4 bg-purple-100 text-purple-700 border border-purple-200 text-[8px] font-black uppercase px-2.5 py-1 rounded-md shadow-subtle select-none">
                    {blog.category}
                  </span>
                </div>

                {/* Content body */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-[9px] font-bold uppercase text-gray-400 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />{" "}
                        {new Date(blog.created_at).toLocaleDateString(locale)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={10} /> {blog.views_count} {t("blog_views")}
                      </span>
                    </div>

                    <h2 className="font-serif text-lg font-black uppercase leading-snug text-black line-clamp-2 transition-colors group-hover:text-primary dark:text-slate-100">
                      {blog.title}
                    </h2>

                    <p className="text-xs font-semibold leading-relaxed text-gray-500 line-clamp-3 dark:text-slate-300">
                      {blog.summary || t("blog_summary_fallback")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-700">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-slate-300">
                      <User size={12} className="text-gray-400 dark:text-slate-500" />
                      {blog.author?.profile?.full_name || t("blog_manager")}
                    </span>
                    <Link
                      to={`/blogs/${blog.slug}`}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-black transition-colors hover:text-primary dark:text-slate-100"
                    >
                      {t("blog_read_article")} <ArrowRight size={14} />
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

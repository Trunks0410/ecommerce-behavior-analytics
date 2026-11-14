import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Eye, User, ArrowLeft, Loader2 } from "lucide-react";
import managerService from "@/services/managerService";
import { useLanguage } from "@/shared/context/LanguageContext";

export const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language, t } = useLanguage();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchBlogDetail = async () => {
      if (!slug) {
        setHasError(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setHasError(false);
      try {
        const data = await managerService.getBlogBySlug(slug);
        setBlog(data);
      } catch (err) {
        console.error("Failed to load blog post:", err);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogDetail();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F4F0] py-36 dark:bg-slate-950">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-sm font-black uppercase tracking-wider text-black dark:text-slate-100">{t("blog_detail_loading")}</p>
      </div>
    );
  }

  if (hasError || !blog) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F4F0] px-6 py-36 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-8 text-center shadow-brutal dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-2 font-serif text-xl font-black uppercase text-red-600">{t("blog_detail_error_title")}</h3>
          <p className="mb-6 text-xs font-bold text-gray-500 dark:text-slate-400">{t("blog_detail_unavailable")}</p>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-black px-6 py-3 text-xs font-black uppercase text-white transition-all hover:bg-primary hover:text-black active:translate-y-0.5 dark:border-primary dark:bg-primary dark:text-black"
          >
            <ArrowLeft size={14} /> {t("blog_back_to_list")}
          </Link>
        </div>
      </div>
    );
  }

  // Parse blocks
  let blocks: any[] = [];
  try {
    blocks = JSON.parse(blog.content);
  } catch {
    blocks = [
      { id: "b-1", type: "HEADING_1", content: blog.title },
      { id: "b-2", type: "PARAGRAPH", content: blog.content },
    ];
  }

  const fmtDate = (d: string) => {
    return new Date(d).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] px-6 pt-12 pb-24 text-slate-900 animate-in fade-in duration-300 dark:bg-slate-950 dark:text-slate-100 md:px-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back navigation */}
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black shadow-subtle transition-all hover:bg-gray-50 active:translate-y-[2px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={12} /> {t("blog_back_to_blog")}
        </Link>

        {/* Article Container */}
        <article className="space-y-6 rounded-[2.5rem] border-2 border-black bg-white p-8 shadow-brutal dark:border-slate-700 dark:bg-slate-900 md:p-12">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4 dark:border-slate-700">
            <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2.5 py-1 rounded">
              {blog.category}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 dark:text-slate-400">
              <Calendar size={12} /> {fmtDate(blog.created_at)}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 dark:text-slate-400">
              <Eye size={12} /> {blog.views_count} {t("blog_views")}
            </span>
          </div>

          {/* Heading Title */}
          <h1 className="font-serif text-3xl font-black uppercase leading-tight text-black dark:text-slate-100 md:text-4xl">
            {blog.title}
          </h1>

          {/* Summary / Introduction */}
          {blog.summary && (
            <div className="rounded-r-xl border-l-4 border-primary bg-gray-50 py-1 pl-4 dark:bg-slate-800">
              <p className="text-xs font-bold italic leading-relaxed text-gray-500 dark:text-slate-300 md:text-sm">
                {blog.summary}
              </p>
            </div>
          )}

          {/* Large Header Banner if present */}
          {blog.thumbnail_url && (
            <div className="w-full overflow-hidden rounded-[2rem] border-2 border-black bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              <img
                src={blog.thumbnail_url}
                alt={t("blog_banner_alt")}
                className="w-full h-80 object-cover"
              />
            </div>
          )}

          {/* Blocks content area */}
          <div className="space-y-6 pt-4">
            {blocks.map((block: any) => {
              switch (block.type) {
                case "HEADING_1":
                  return (
                    <h2
                      key={block.id}
                      className="border-l-4 border-blue-500 pl-3 pt-1 text-lg font-black leading-tight text-black dark:text-slate-100 md:text-xl"
                    >
                      {block.content}
                    </h2>
                  );
                case "HEADING_2":
                  return (
                    <h3
                      key={block.id}
                      className="text-sm font-bold leading-snug text-black dark:text-slate-100 md:text-base"
                    >
                      {block.content}
                    </h3>
                  );
                case "PARAGRAPH":
                  return (
                    <p
                      key={block.id}
                      className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-gray-700 dark:text-slate-300 md:text-sm"
                    >
                      {block.content}
                    </p>
                  );
                case "IMAGE":
                  return (
                    <div key={block.id} className="space-y-2 text-center py-2">
                      {block.content && (
                        <img
                          src={block.content}
                          alt={block.caption || t("blog_photo_alt")}
                          className="mx-auto max-h-96 rounded-2xl border border-black/10 object-cover shadow-sm dark:border-slate-600"
                        />
                      )}
                      {block.caption && (
                        <p className="text-[10px] font-bold italic text-gray-500 dark:text-slate-400 md:text-xs">
                          {block.caption}
                        </p>
                      )}
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>

          {/* Author footer banner */}
          <div className="mt-12 flex items-center justify-between border-t border-dashed border-gray-200 pt-6 text-xs font-bold text-gray-500 dark:border-slate-700 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              {t("blog_posted_by")}{" "}
              <span className="font-black uppercase text-black dark:text-slate-100">
                {blog.author?.profile?.full_name || blog.author?.email || t("blog_manager")}
              </span>
            </span>
          </div>
        </article>
      </div>
    </div>
  );
};

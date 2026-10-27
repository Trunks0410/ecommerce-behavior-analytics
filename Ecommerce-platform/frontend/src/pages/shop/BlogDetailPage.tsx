import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Eye, User, ArrowLeft, Loader2 } from "lucide-react";
import managerService from "@/services/managerService";

export const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBlogDetail = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const data = await managerService.getBlogBySlug(slug);
        setBlog(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Lỗi tải bài viết chi tiết");
      } finally {
        setLoading(false);
      }
    };
    fetchBlogDetail();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center py-36">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-sm font-black uppercase tracking-wider text-black">Đang tải nội dung bài viết...</p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center py-36 px-6">
        <div className="bg-white border-2 border-black rounded-[2rem] p-8 max-w-md w-full text-center shadow-brutal">
          <h3 className="text-xl font-serif font-black uppercase text-red-600 mb-2">Đã xảy ra lỗi</h3>
          <p className="text-xs text-gray-500 font-bold mb-6">{error || "Bài viết không tồn tại hoặc đã bị ẩn"}</p>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase bg-black text-white hover:bg-primary transition-all active:translate-y-0.5"
          >
            <ArrowLeft size={14} /> Quay lại danh sách
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
    return new Date(d).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-12 pb-24 px-6 md:px-12 animate-in fade-in duration-300">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back navigation */}
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-wider bg-white hover:bg-gray-50 active:translate-y-[2px] transition-all shadow-subtle text-black"
        >
          <ArrowLeft size={12} /> Quay lại Blog
        </Link>

        {/* Article Container */}
        <article className="bg-white border-2 border-black rounded-[2.5rem] p-8 md:p-12 shadow-brutal space-y-6">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
            <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2.5 py-1 rounded">
              {blog.category}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
              <Calendar size={12} /> {fmtDate(blog.created_at)}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
              <Eye size={12} /> {blog.views_count} lượt xem
            </span>
          </div>

          {/* Heading Title */}
          <h1 className="font-serif text-3xl md:text-4xl font-black uppercase text-black leading-tight">
            {blog.title}
          </h1>

          {/* Summary / Introduction */}
          {blog.summary && (
            <div className="border-l-4 border-primary pl-4 py-1 bg-gray-50 rounded-r-xl">
              <p className="text-xs md:text-sm text-gray-500 font-bold italic leading-relaxed">
                {blog.summary}
              </p>
            </div>
          )}

          {/* Large Header Banner if present */}
          {blog.thumbnail_url && (
            <div className="w-full overflow-hidden rounded-[2rem] border-2 border-black bg-gray-50">
              <img
                src={blog.thumbnail_url}
                alt="banner"
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
                      className="text-lg md:text-xl font-black text-black leading-tight border-l-4 border-blue-500 pl-3 pt-1"
                    >
                      {block.content}
                    </h2>
                  );
                case "HEADING_2":
                  return (
                    <h3
                      key={block.id}
                      className="text-sm md:text-base font-bold text-black leading-snug"
                    >
                      {block.content}
                    </h3>
                  );
                case "PARAGRAPH":
                  return (
                    <p
                      key={block.id}
                      className="text-xs md:text-sm font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap"
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
                          alt={block.caption || "blog photo"}
                          className="max-h-96 mx-auto object-cover rounded-2xl border border-black/10 shadow-sm"
                        />
                      )}
                      {block.caption && (
                        <p className="text-[10px] md:text-xs text-gray-500 font-bold italic">
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
          <div className="mt-12 pt-6 border-t border-dashed border-gray-200 flex items-center justify-between text-xs font-bold text-gray-500">
            <span className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              Đăng bởi:{" "}
              <span className="text-black font-black uppercase">
                {blog.author?.profile?.full_name || blog.author?.email || "Quản lý"}
              </span>
            </span>
          </div>
        </article>
      </div>
    </div>
  );
};

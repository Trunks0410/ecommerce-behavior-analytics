import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Type,
  Eye,
  Loader2,
  Upload,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  useManagerBlogs,
  useCreateBlog,
  useUpdateBlog,
  useDeleteBlog,
} from "@/hooks/useManager";
import { managerService } from "@/services/managerService";

interface Block {
  id: string;
  type: "HEADING_1" | "HEADING_2" | "PARAGRAPH" | "IMAGE";
  content: string;
  caption?: string; // Chỉ dùng cho ảnh
}

interface BlogTabProps {
  addNotification: (msg: string) => void;
}

export const BlogTab: React.FC<BlogTabProps> = ({ addNotification }) => {
  const { data: blogs, isLoading: isBlogsLoading } = useManagerBlogs();
  const createBlogMutation = useCreateBlog();
  const updateBlogMutation = useUpdateBlog();
  const deleteBlogMutation = useDeleteBlog();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Local uploading indicators
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  // Switch to Create Mode
  const startCreate = () => {
    setTitle("");
    setCategory("");
    setSummary("");
    setThumbnailUrl("");
    setStatus("DRAFT");
    setBlocks([
      { id: "b-1", type: "HEADING_1", content: "Tiêu đề lớn" },
      { id: "b-2", type: "PARAGRAPH", content: "Viết nội dung tại đây..." },
    ]);
    setIsEditing(true);
    setEditingId(null);
  };

  // Switch to Edit Mode
  const startEdit = (blog: any) => {
    setTitle(blog.title);
    setCategory(blog.category);
    setSummary(blog.summary || "");
    setThumbnailUrl(blog.thumbnail_url || "");
    setStatus(blog.status);
    setEditingId(blog.id);
    setIsEditing(true);

    try {
      const parsedBlocks = JSON.parse(blog.content);
      if (Array.isArray(parsedBlocks)) {
        setBlocks(parsedBlocks);
      } else {
        setBlocks([]);
      }
    } catch {
      setBlocks([
        { id: "b-1", type: "HEADING_1", content: blog.title },
        { id: "b-2", type: "PARAGRAPH", content: blog.content },
      ]);
    }
  };

  // Upload blog thumbnail
  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploadingThumbnail(true);
    try {
      const res = await managerService.uploadBlogImage(e.target.files[0]);
      if (res.url) {
        setThumbnailUrl(res.url);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi tải ảnh lên");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  // Upload image in a block
  const handleBlockImageChange = async (blockId: string, file: File) => {
    setUploadingBlockId(blockId);
    try {
      const res = await managerService.uploadBlogImage(file);
      if (res.url) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, content: res.url } : b))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi tải ảnh lên");
    } finally {
      setUploadingBlockId(null);
    }
  };

  // Block management
  const addBlock = (type: "HEADING_1" | "HEADING_2" | "PARAGRAPH" | "IMAGE") => {
    const newBlock: Block = {
      id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      content:
        type === "IMAGE"
          ? ""
          : type === "HEADING_1"
          ? "Tiêu đề lớn mới"
          : type === "HEADING_2"
          ? "Tiêu đề phụ mới"
          : "Nội dung đoạn văn mới...",
      caption: type === "IMAGE" ? "Chú thích hình ảnh" : undefined,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    setBlocks(newBlocks);
  };

  const updateBlockContent = (id: string, value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content: value } : b))
    );
  };

  const updateBlockCaption = (id: string, value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, caption: value } : b))
    );
  };

  // Save Blog
  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("Vui lòng nhập tiêu đề bài viết");
    if (!category.trim()) return alert("Vui lòng nhập danh mục bài viết");
    if (blocks.length === 0) return alert("Bài viết phải có ít nhất 1 khối nội dung");

    const payload = {
      title,
      summary,
      thumbnail_url: thumbnailUrl,
      category,
      status,
      content: JSON.stringify(blocks),
    };

    if (editingId) {
      updateBlogMutation.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            addNotification(`Đã cập nhật bài viết: "${title}"`);
            setIsEditing(false);
          },
          onError: (err: any) => {
            alert(err.response?.data?.message || "Cập nhật bài viết thất bại");
          },
        }
      );
    } else {
      createBlogMutation.mutate(payload, {
        onSuccess: () => {
          addNotification(`Đã xuất bản bài viết mới: "${title}"`);
          setIsEditing(false);
        },
        onError: (err: any) => {
          alert(err.response?.data?.message || "Tạo bài viết thất bại");
        },
      });
    }
  };

  // Delete Blog
  const handleDeleteBlog = (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài viết "${name}"?`)) return;
    deleteBlogMutation.mutate(id, {
      onSuccess: () => {
        addNotification(`Đã xóa bài viết "${name}"`);
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {isEditing ? (
        // Editor Screen
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 border-2 border-black hover:bg-gray-50 rounded-xl transition-colors active:translate-y-0.5"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-3xl font-serif font-black uppercase">
                  {editingId ? "Cập nhật bài viết" : "Viết bài mới"}
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Trình thiết kế nội dung dạng khối (Block Editor)
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="border-2 border-black rounded-xl px-4 py-2 font-bold text-xs bg-white text-black focus:outline-none"
              >
                <option value="DRAFT">Lưu Bản Nháp</option>
                <option value="PUBLISHED">Đã Xuất Bản</option>
              </select>
              <button
                onClick={handleSaveBlog}
                disabled={createBlogMutation.isPending || updateBlogMutation.isPending}
                className="px-6 py-2 bg-black text-white border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                {createBlogMutation.isPending || updateBlogMutation.isPending
                  ? "Đang lưu..."
                  : "Lưu bài viết"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Form & Block editor */}
            <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
              <h3 className="text-sm font-black uppercase tracking-widest border-b border-gray-100 pb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-primary" /> Thông tin cơ bản
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                      Tiêu đề bài viết
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập tiêu đề..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                      Danh mục (Manager tự nhập)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Xu hướng thời trang, Mẹo mua sắm..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                    Tóm tắt ngắn (Summary)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả ngắn hiển thị ở danh sách bài viết..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                  />
                </div>

                {/* Upload Thumbnail field */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                    Ảnh đại diện bài viết (Thumbnail)
                  </label>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-xl font-black text-[10px] uppercase bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                      <Upload size={14} />
                      {isUploadingThumbnail ? "Đang tải ảnh lên..." : "Tải ảnh từ máy"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailFileChange}
                        className="hidden"
                        disabled={isUploadingThumbnail}
                      />
                    </label>
                    {thumbnailUrl && (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={thumbnailUrl}
                          readOnly
                          className="flex-1 bg-gray-100 border border-gray-200 rounded-lg p-1.5 text-[10px] font-bold truncate"
                        />
                        <img
                          src={thumbnailUrl}
                          alt="thumbnail preview"
                          className="w-10 h-10 object-cover rounded-lg border border-black/10"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Block Editor Stack */}
              <div className="border-t border-dashed border-gray-200 pt-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest">
                    Cấu trúc các khối bài viết
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => addBlock("HEADING_1")}
                      className="px-2.5 py-1.5 border border-black rounded-lg text-[9px] font-black uppercase bg-sky-50 hover:bg-sky-100 flex items-center gap-1"
                    >
                      <Heading1 size={12} /> +Tiêu đề chính
                    </button>
                    <button
                      onClick={() => addBlock("HEADING_2")}
                      className="px-2.5 py-1.5 border border-black rounded-lg text-[9px] font-black uppercase bg-violet-50 hover:bg-violet-100 flex items-center gap-1"
                    >
                      <Heading2 size={12} /> +Tiêu đề phụ
                    </button>
                    <button
                      onClick={() => addBlock("PARAGRAPH")}
                      className="px-2.5 py-1.5 border border-black rounded-lg text-[9px] font-black uppercase bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <Type size={12} /> +Đoạn văn
                    </button>
                    <button
                      onClick={() => addBlock("IMAGE")}
                      className="px-2.5 py-1.5 border border-black rounded-lg text-[9px] font-black uppercase bg-amber-50 hover:bg-amber-100 flex items-center gap-1"
                    >
                      <ImageIcon size={12} /> +Hình ảnh
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="border-2 border-black rounded-xl p-4 bg-gray-50 flex gap-4 items-start relative group"
                    >
                      <span className="absolute -left-2 top-3 w-5 h-5 bg-black text-white text-[9px] font-black rounded-md flex items-center justify-center">
                        {idx + 1}
                      </span>

                      <div className="flex-1 space-y-2 mt-1">
                        {/* Type indicator */}
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-black uppercase bg-black/10 px-2 py-0.5 rounded text-gray-700">
                            Khối: {block.type}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveBlock(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              onClick={() => moveBlock(idx, "down")}
                              disabled={idx === blocks.length - 1}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button
                              onClick={() => removeBlock(block.id)}
                              className="p-1 hover:bg-red-100 text-red-600 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Block input fields */}
                        {block.type === "IMAGE" ? (
                          <div className="space-y-3">
                            <div className="flex gap-2 items-center">
                              <label className="flex items-center gap-1 px-3 py-1.5 border border-black rounded-lg text-[9px] font-black uppercase bg-white hover:bg-gray-50 cursor-pointer">
                                <Upload size={12} />
                                {uploadingBlockId === block.id ? "Đang tải..." : "Tải ảnh"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleBlockImageChange(block.id, e.target.files[0]);
                                    }
                                  }}
                                  disabled={uploadingBlockId === block.id}
                                />
                              </label>
                              <input
                                type="text"
                                placeholder="URL Hình ảnh hoặc tải lên..."
                                value={block.content}
                                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                className="flex-1 bg-white border border-black/20 rounded-lg px-3 py-1 text-xs font-bold focus:outline-none"
                              />
                            </div>
                            {block.content && (
                              <img
                                src={block.content}
                                alt="preview"
                                className="max-h-24 object-cover rounded-lg border border-black/10"
                              />
                            )}
                            <input
                              type="text"
                              placeholder="Chú thích hình ảnh (ví dụ: Hình 1: ...)"
                              value={block.caption || ""}
                              onChange={(e) => updateBlockCaption(block.id, e.target.value)}
                              className="w-full bg-white border border-black/20 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        ) : (
                          <textarea
                            rows={block.type === "PARAGRAPH" ? 3 : 1}
                            value={block.content}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            placeholder={
                              block.type === "HEADING_1"
                                ? "Nhập tiêu đề chính..."
                                : block.type === "HEADING_2"
                                ? "Nhập tiêu đề phụ..."
                                : "Nhập đoạn văn nội dung..."
                            }
                            className={`w-full bg-white border border-black/20 rounded-lg p-3 text-xs focus:outline-none ${
                              block.type === "HEADING_1"
                                ? "font-black text-sm"
                                : block.type === "HEADING_2"
                                ? "font-bold text-xs"
                                : "font-semibold"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {blocks.length === 0 && (
                    <p className="text-center py-6 text-xs text-gray-400 italic font-bold">
                      Chưa có khối nội dung nào. Hãy chọn thêm các khối phía trên.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Beautiful Live Preview */}
            <div className="bg-[#FAF9F5] border-2 border-black rounded-[2rem] p-10 shadow-sm max-h-[80vh] overflow-y-auto relative">
              <span className="absolute right-6 top-6 bg-black text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-full border border-black shadow-subtle tracking-wider flex items-center gap-1 select-none">
                <Eye size={10} /> Live Preview
              </span>

              <article className="max-w-xl mx-auto space-y-6 pt-6">
                {/* Category & Stats */}
                <div className="flex gap-2 items-center">
                  {category && (
                    <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2.5 py-1 rounded">
                      {category}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-gray-400 uppercase">
                    • 27/06/2026 • Lượt xem: 0
                  </span>
                </div>

                {/* Title */}
                {title ? (
                  <h1 className="text-2xl font-serif font-black uppercase text-black leading-tight border-b-2 border-black/5 pb-2">
                    {title}
                  </h1>
                ) : (
                  <h1 className="text-2xl font-serif font-black uppercase text-gray-300 leading-tight border-b-2 border-gray-100 pb-2">
                    (Tiêu đề bài viết)
                  </h1>
                )}

                {/* Summary */}
                {summary && (
                  <p className="text-xs text-gray-500 font-bold border-l-2 border-primary pl-3 italic">
                    {summary}
                  </p>
                )}

                {/* Blocks Rendering */}
                <div className="space-y-5 pt-2">
                  {blocks.map((block) => {
                    switch (block.type) {
                      case "HEADING_1":
                        return (
                          <h2
                            key={block.id}
                            className="text-base font-black text-black leading-tight border-l-4 border-blue-500 pl-3 pt-0.5"
                          >
                            {block.content || "(Tiêu đề chính)"}
                          </h2>
                        );
                      case "HEADING_2":
                        return (
                          <h3 key={block.id} className="text-sm font-bold text-black leading-snug">
                            {block.content || "(Tiêu đề phụ)"}
                          </h3>
                        );
                      case "PARAGRAPH":
                        return (
                          <p
                            key={block.id}
                            className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap"
                          >
                            {block.content || "(Nội dung đoạn văn)"}
                          </p>
                        );
                      case "IMAGE":
                        return (
                          <div key={block.id} className="space-y-2 text-center py-2">
                            {block.content ? (
                              <img
                                src={block.content}
                                alt="blog image"
                                className="max-h-60 mx-auto object-cover rounded-xl border border-black/10"
                              />
                            ) : (
                              <div className="w-full h-32 bg-gray-200 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-xs text-gray-400 font-bold">
                                (Chưa chọn hình ảnh)
                              </div>
                            )}
                            {block.caption && (
                              <p className="text-[10px] text-gray-500 font-bold italic">
                                {block.caption}
                              </p>
                            )}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                  {blocks.length === 0 && (
                    <p className="text-center text-xs text-gray-400 italic">
                      Chưa viết nội dung bài viết
                    </p>
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      ) : (
        // List Screen
        <>
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-3xl font-serif font-black uppercase">
                Quản lý Blog Tin Tức
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Xuất bản và quản trị các bài viết chia sẻ xu hướng mua sắm
              </p>
            </div>
            <button
              onClick={startCreate}
              className="px-5 py-3 border-2 border-black bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Viết bài mới
            </button>
          </div>

          <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm">
            {isBlogsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={36} />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-black/5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50">
                    <th className="px-8 py-6">Tiêu đề bài viết</th>
                    <th className="px-8 py-6">Danh mục</th>
                    <th className="px-8 py-6 text-center">Lượt xem</th>
                    <th className="px-8 py-6">Trạng thái</th>
                    <th className="px-8 py-6 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/5">
                  {!blogs || blogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-8 py-10 text-center text-xs font-bold text-gray-400 italic"
                      >
                        Chưa có bài viết nào được đăng tải.
                      </td>
                    </tr>
                  ) : (
                    blogs.map((blog: any) => (
                      <tr key={blog.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            {blog.thumbnail_url ? (
                              <img
                                src={blog.thumbnail_url}
                                alt="thumb"
                                className="w-14 h-14 object-cover rounded-xl border border-black/5"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gray-100 rounded-xl border border-black/5 flex items-center justify-center font-black text-gray-400">
                                Blog
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-black uppercase line-clamp-1">
                                {blog.title}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                Tạo ngày: {new Date(blog.created_at).toLocaleDateString("vi-VN")}{" "}
                                | Tác giả: {blog.author?.profile?.full_name || blog.author?.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[9px] font-black uppercase px-2.5 py-1.5 rounded">
                            {blog.category}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center text-xs font-black">
                          {blog.views_count}
                        </td>
                        <td className="px-8 py-6">
                          <span
                            className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${
                              blog.status === "PUBLISHED"
                                ? "bg-green-50 text-green-600 border-green-100"
                                : "bg-yellow-50 text-yellow-600 border-yellow-100"
                            }`}
                          >
                            {blog.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => startEdit(blog)}
                              className="px-3 py-2 border-2 border-black rounded-lg font-black text-[10px] uppercase bg-white hover:bg-gray-50 active:translate-y-0.5"
                            >
                              Sửa bài
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(blog.id, blog.title)}
                              className="px-3 py-2 border-2 border-black rounded-lg font-black text-[10px] uppercase text-red-600 bg-white hover:bg-red-50 active:translate-y-0.5"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  X,
  ArrowRight,
  Maximize2,
  RefreshCw,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  Tag,
  AlertCircle,
  Video,
} from "lucide-react";
import {
  visualSearchProducts,
  extractVisualMetadata,
  VisualSearchProduct,
  VisualSearchResponse,
} from "@/services/visualSearchService";
import { useLanguage } from "@/shared/context/LanguageContext";

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type InteractionMode = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e" | null;

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);

  // Trạng thái ảnh
  const [selectedImageFile, setSelectedImageFile] = useState<File | Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Trạng thái tìm kiếm & kết quả
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<VisualSearchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trạng thái Bounding Box / Crop tương tác
  const [cropBox, setCropBox] = useState({ x: 15, y: 15, width: 70, height: 70 });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);

  const interactionStartRef = useRef<{
    startX: number;
    startY: number;
    startBox: { x: number; y: number; width: number; height: number };
  }>({ startX: 0, startY: 0, startBox: { x: 15, y: 15, width: 70, height: 70 } });

  // Trạng thái Webcam
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  // Lắng nghe sự kiện Paste (Ctrl + V) từ Clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processSelectedImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  // Dọn dẹp stream Webcam khi đóng modal
  useEffect(() => {
    if (!isOpen && webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
      setIsWebcamActive(false);
    }
  }, [isOpen, webcamStream]);

  // Xử lý nạp ảnh vào hệ thống
  const processSelectedImage = async (file: File | Blob) => {
    setErrorMessage(null);
    setSelectedImageFile(file);
    setIsLoading(true);
    setIsScanning(true);
    setCropBox({ x: 15, y: 15, width: 70, height: 70 });

    try {
      const originalName = file instanceof File ? file.name : undefined;
      const metadata = await extractVisualMetadata(file, originalName);
      setImagePreviewUrl(metadata.previewUrl);

      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
        setIsWebcamActive(false);
      }

      const result = await visualSearchProducts(file, metadata);
      setSearchResult(result);
    } catch (err: any) {
      console.error("Lỗi tìm kiếm hình ảnh:", err);
      setErrorMessage(
        err.response?.data?.message ||
        (t("no_products_desc") || "Không thể phân tích hình ảnh này. Vui lòng thử một ảnh rõ nét hơn.")
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsScanning(false), 800);
    }
  };

  // Kéo & điều chỉnh kích thước khung tiêu điểm
  const handleStartInteraction = (mode: InteractionMode, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setInteractionMode(mode);
    interactionStartRef.current = {
      startX: clientX,
      startY: clientY,
      startBox: { ...cropBox },
    };
  };

  useEffect(() => {
    if (!interactionMode) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaXPercent = ((clientX - interactionStartRef.current.startX) / rect.width) * 100;
      const deltaYPercent = ((clientY - interactionStartRef.current.startY) / rect.height) * 100;

      const { x, y, width, height } = interactionStartRef.current.startBox;

      let newX = x;
      let newY = y;
      let newW = width;
      let newH = height;

      const MIN_SIZE = 15;

      if (interactionMode === "move") {
        newX = Math.max(0, Math.min(100 - width, x + deltaXPercent));
        newY = Math.max(0, Math.min(100 - height, y + deltaYPercent));
      } else {
        if (interactionMode.includes("e")) {
          newW = Math.max(MIN_SIZE, Math.min(100 - x, width + deltaXPercent));
        }
        if (interactionMode.includes("s")) {
          newH = Math.max(MIN_SIZE, Math.min(100 - y, height + deltaYPercent));
        }
        if (interactionMode.includes("w")) {
          const maxLeftShift = x + width - MIN_SIZE;
          const proposedX = Math.max(0, Math.min(maxLeftShift, x + deltaXPercent));
          newW = width + (x - proposedX);
          newX = proposedX;
        }
        if (interactionMode.includes("n")) {
          const maxTopShift = y + height - MIN_SIZE;
          const proposedY = Math.max(0, Math.min(maxTopShift, y + deltaYPercent));
          newH = height + (y - proposedY);
          newY = proposedY;
        }
      }

      setCropBox({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    };

    const handlePointerUp = () => {
      setInteractionMode(null);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [interactionMode]);

  // Áp dụng vùng crop và tìm kiếm lại theo tiêu điểm chính xác
  const handleApplyFocusCrop = async (targetBox = cropBox) => {
    if (!imagePreviewUrl) return;
    setIsLoading(true);
    setIsScanning(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imagePreviewUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const containerEl = containerRef.current;
      const cW = containerEl ? containerEl.clientWidth : 380;
      const cH = containerEl ? containerEl.clientHeight : 320;

      // Tính tỷ lệ hiển thị object-contain thực tế của ảnh
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const cAspect = cW / cH;

      let renderedW = cW;
      let renderedH = cH;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > cAspect) {
        renderedH = cW / imgAspect;
        offsetY = (cH - renderedH) / 2;
      } else {
        renderedW = cH * imgAspect;
        offsetX = (cW - renderedW) / 2;
      }

      // Chuyển đổi phần trăm cropBox trên container sang pixel trên ảnh gốc
      const boxPxX = (targetBox.x / 100) * cW;
      const boxPxY = (targetBox.y / 100) * cH;
      const boxPxW = (targetBox.width / 100) * cW;
      const boxPxH = (targetBox.height / 100) * cH;

      const relX = Math.max(0, boxPxX - offsetX);
      const relY = Math.max(0, boxPxY - offsetY);
      const relW = Math.min(boxPxW, renderedW - relX);
      const relH = Math.min(boxPxH, renderedH - relY);

      const sx = Math.max(0, Math.min(img.naturalWidth - 10, Math.round((relX / renderedW) * img.naturalWidth)));
      const sy = Math.max(0, Math.min(img.naturalHeight - 10, Math.round((relY / renderedH) * img.naturalHeight)));
      const sw = Math.max(16, Math.min(img.naturalWidth - sx, Math.round((relW / renderedW) * img.naturalWidth)));
      const sh = Math.max(16, Math.min(img.naturalHeight - sy, Math.round((relH / renderedH) * img.naturalHeight)));

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(32, sw);
      canvas.height = Math.max(32, sh);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const originalName = selectedImageFile instanceof File ? selectedImageFile.name : undefined;
            const metadata = await extractVisualMetadata(blob, originalName);
            const result = await visualSearchProducts(blob, metadata);
            setSearchResult(result);
          }
        }, "image/jpeg", 0.95);
      }
    } catch (err: any) {
      console.error("Lỗi cắt ảnh:", err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsScanning(false), 600);
    }
  };

  // Chọn ảnh từ tệp tin thiết bị
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedImage(e.target.files[0]);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedImage(e.dataTransfer.files[0]);
    }
  };

  // Bật Webcam
  const handleStartWebcam = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setWebcamStream(stream);
      setIsWebcamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Không thể mở Camera:", err);
      setErrorMessage("Không thể truy cập Camera. Vui lòng kiểm tra quyền thiết bị.");
    }
  };

  // Chụp ảnh từ Webcam
  const handleCaptureWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          processSelectedImage(blob);
        }
      }, "image/jpeg", 0.95);
    }
  };

  // Điều hướng xem sản phẩm
  const handleViewProduct = (product: VisualSearchProduct) => {
    onClose();
    navigate(`/products/${product.slug || product.id}`);
  };

  // Điều hướng sang trang danh mục đầy đủ
  const handleViewAllResults = () => {
    if (imagePreviewUrl) {
      sessionStorage.setItem("last_visual_search_image", imagePreviewUrl);
    }
    if (searchResult) {
      sessionStorage.setItem("last_visual_search_data", JSON.stringify(searchResult));
    }
    onClose();
    navigate(`/products?visualSearch=1`);
  };

  // Đặt lại tìm kiếm ảnh khác
  const handleResetSearch = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setSearchResult(null);
    setErrorMessage(null);
    setCropBox({ x: 15, y: 15, width: 70, height: 70 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================
            HEADER MODAL
           =================================================================== */}
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ee4d2d]/10 text-[#ee4d2d] flex items-center justify-center shadow-xs">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {t("visual_search_title")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("visual_search_subtitle")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={t("visual_search_close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* ===================================================================
            THÂN MODAL
           =================================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* =================================================================
              TRƯỜNG HỢP 1: CHƯA CHỌN ẢNH -> HIỂN THỊ KHUNG NẠP ẢNH
             ================================================================= */}
          {!imagePreviewUrl && !isWebcamActive && (
            <div className="space-y-6">
              {/* Dropzone chính */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                  isDragging
                    ? "border-[#ee4d2d] bg-[#fef0ed] dark:bg-[#ee4d2d]/10 scale-[1.01]"
                    : "border-slate-300 dark:border-slate-700 hover:border-[#ee4d2d] bg-slate-50/50 dark:bg-slate-900/50 hover:bg-[#fef0ed]/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-800 text-[#ee4d2d] border border-gray-200 dark:border-slate-700 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Upload size={28} />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("visual_search_drag_drop")}{" "}
                    <span className="text-[#ee4d2d] underline">{t("visual_search_browse")}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("visual_search_format_hint")}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t("visual_search_paste_tip")}
                </div>
              </div>

              {/* Nút bật Camera / Webcam */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleStartWebcam}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Video size={16} className="text-[#ee4d2d]" />
                  <span>{t("visual_search_camera_btn")}</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              TRƯỜNG HỢP 2: ĐANG BẬT WEBCAM / CAMERA
             ================================================================= */}
          {isWebcamActive && (
            <div className="space-y-4 text-center">
              <div className="relative mx-auto max-w-lg rounded-3xl overflow-hidden bg-black shadow-lg aspect-video border-2 border-[#ee4d2d]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Khung ngắm chụp sản phẩm */}
                <div className="absolute inset-8 border-2 border-dashed border-white/70 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                    {t("visual_search_camera_frame_hint")}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureWebcam}
                  className="px-6 py-2.5 rounded-full bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Camera size={16} />
                  <span>{t("visual_search_camera_capture")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    webcamStream?.getTracks().forEach((trk) => trk.stop());
                    setWebcamStream(null);
                    setIsWebcamActive(false);
                  }}
                  className="px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t("visual_search_camera_cancel")}
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              TRƯỜNG HỢP 3: ĐÃ CHỌN ẢNH -> KHUNG CROP TƯƠNG TÁC + KẾT QUẢ
             ================================================================= */}
          {imagePreviewUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* KHU VỰC TRÁI: PREVIEW ẢNH + KHUNG TIÊU ĐIỂM TƯƠNG TÁC */}
              <div className="lg:col-span-5 space-y-3.5">
                <div
                  ref={containerRef}
                  className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-inner group select-none"
                >
                  <img
                    ref={imgElementRef}
                    src={imagePreviewUrl}
                    alt="Query"
                    className="w-full h-72 sm:h-80 object-contain mx-auto pointer-events-none select-none"
                  />

                  {/* Hiệu ứng quét Laser khi đang phân tích */}
                  {isScanning && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ee4d2d] to-transparent shadow-[0_0_15px_#ee4d2d] animate-laser-scan pointer-events-none" />
                  )}

                  {/* Khung Bounding Box có thể di chuyển và kéo dãn kích thước */}
                  <div
                    className="absolute border-2 border-[#ee4d2d] bg-[#ee4d2d]/15 rounded-xl cursor-move touch-none shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-shadow duration-150"
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`,
                    }}
                    onMouseDown={(e) => handleStartInteraction("move", e)}
                    onTouchStart={(e) => handleStartInteraction("move", e)}
                  >
                    {/* 4 Chốt kéo góc */}
                    <div
                      className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#ee4d2d] rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      onMouseDown={(e) => handleStartInteraction("nw", e)}
                      onTouchStart={(e) => handleStartInteraction("nw", e)}
                      title="Kéo chỉnh góc trên trái"
                    />
                    <div
                      className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#ee4d2d] rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      onMouseDown={(e) => handleStartInteraction("ne", e)}
                      onTouchStart={(e) => handleStartInteraction("ne", e)}
                      title="Kéo chỉnh góc trên phải"
                    />
                    <div
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#ee4d2d] rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      onMouseDown={(e) => handleStartInteraction("sw", e)}
                      onTouchStart={(e) => handleStartInteraction("sw", e)}
                      title="Kéo chỉnh góc dưới trái"
                    />
                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#ee4d2d] rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      onMouseDown={(e) => handleStartInteraction("se", e)}
                      onTouchStart={(e) => handleStartInteraction("se", e)}
                      title="Kéo chỉnh góc dưới phải"
                    />

                    {/* 4 Chốt kéo cạnh */}
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-1.5 bg-white border border-[#ee4d2d] rounded-full cursor-ns-resize"
                      onMouseDown={(e) => handleStartInteraction("n", e)}
                      onTouchStart={(e) => handleStartInteraction("n", e)}
                    />
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-1.5 bg-white border border-[#ee4d2d] rounded-full cursor-ns-resize"
                      onMouseDown={(e) => handleStartInteraction("s", e)}
                      onTouchStart={(e) => handleStartInteraction("s", e)}
                    />
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-white border border-[#ee4d2d] rounded-full cursor-ew-resize"
                      onMouseDown={(e) => handleStartInteraction("w", e)}
                      onTouchStart={(e) => handleStartInteraction("w", e)}
                    />
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-3.5 bg-white border border-[#ee4d2d] rounded-full cursor-ew-resize"
                      onMouseDown={(e) => handleStartInteraction("e", e)}
                      onTouchStart={(e) => handleStartInteraction("e", e)}
                    />

                    {/* Nhãn tiêu điểm */}
                    <span className="absolute -top-3 left-3 bg-[#ee4d2d] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs pointer-events-none select-none flex items-center gap-1">
                      <Maximize2 size={9} />
                      {t("visual_search_focus_title")}
                    </span>
                  </div>

                  {/* Nút đổi ảnh khác */}
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                    title={t("visual_search_change_image")}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* Hướng dẫn và nút Áp dụng tiêu điểm */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Maximize2 size={12} className="text-[#ee4d2d] shrink-0" />
                    <span>{t("visual_search_focus_hint")}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyFocusCrop()}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sliders size={12} />
                    <span>{t("visual_search_focus_apply")}</span>
                  </button>
                </div>

                {/* Đặc trưng nhận diện */}
                {searchResult?.visualFeatures && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag size={13} className="text-[#ee4d2d]" /> {t("visual_search_features_title")}
                      </span>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300 shadow-xs"
                          style={{ backgroundColor: searchResult.visualFeatures.dominantColorHex }}
                        />
                        <span>{searchResult.visualFeatures.dominantColor || t("visual_search_auto_detected")}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {searchResult.visualFeatures.smartTags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-2xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* KHU VỰC PHẢI: KẾT QUẢ SẢN PHẨM TƯƠNG ĐỒNG */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{t("visual_search_most_similar")}</span>
                      {searchResult && (
                        <span className="text-xs font-normal text-slate-500">
                          ({t("visual_search_found_count").replace("{count}", String(searchResult.total || searchResult.products.length))})
                        </span>
                      )}
                    </h3>
                  </div>

                  {searchResult && searchResult.products.length > 0 && (
                    <button
                      type="button"
                      onClick={handleViewAllResults}
                      className="text-xs font-bold text-[#ee4d2d] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t("visual_search_view_full_list")}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>

                {/* Loading Skeleton */}
                {isLoading && (
                  <div className="grid grid-cols-2 gap-3.5">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 animate-pulse space-y-2.5"
                      >
                        <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Danh sách thẻ sản phẩm khớp */}
                {!isLoading && searchResult?.products && searchResult.products.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
                    {searchResult.products.map((product) => {
                      const displayPrice = product.sale_price
                        ? Number(product.sale_price).toLocaleString("vi-VN")
                        : Number(product.price).toLocaleString("vi-VN");

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleViewProduct(product)}
                          className="group p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-[#ee4d2d] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
                        >
                          <div className="relative rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 aspect-square">
                            <img
                              src={product.primary_image || "/placeholder.jpg"}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Similarity Score Badge */}
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 backdrop-blur-xs">
                              <CheckCircle2 size={10} />
                              <span>
                                {t("visual_search_similarity_badge").replace(
                                  "{score}",
                                  String(product.similarity_score)
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#ee4d2d] transition-colors line-clamp-2 leading-tight">
                              {product.name}
                            </h4>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="font-bold text-[#ee4d2d]">
                                {displayPrice} ₫
                              </span>
                              {product.category?.name && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                                  {product.category.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Khi không tìm thấy sản phẩm */}
                {!isLoading && searchResult?.products && searchResult.products.length === 0 && (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                      <ShoppingBag size={24} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {t("visual_search_no_products")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            FOOTER ACTIONS
           =================================================================== */}
        {imagePreviewUrl && searchResult && searchResult.products.length > 0 && (
          <div className="px-6 py-3.5 border-t border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {t("visual_search_footer_algorithm")}
            </span>
            <button
              type="button"
              onClick={handleViewAllResults}
              className="px-5 py-2 rounded-xl bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t("visual_search_view_full_list")}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualSearchModal;

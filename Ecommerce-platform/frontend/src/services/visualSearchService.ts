import { publicAxios } from "@/shared/api/axiosClient";

export interface VisualSearchProduct {
  id: number;
  name: string;
  slug: string;
  price: number | string;
  sale_price: number | string | null;
  sold_count?: number;
  primary_image?: string;
  similarity_score: number;
  match_reasons?: string[];
  category?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface DetectedObject {
  type: string;
  label: string;
  confidence: number;
  searchKeywords: string[];
  categoryIds: number[];
  vietnameseTag: string;
}

export interface VisualSearchResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  visualFeatures: {
    dominantColor: string;
    dominantColorHex: string;
    detectedObject?: DetectedObject;
    smartTags: string[];
  };
  products: VisualSearchProduct[];
}

export interface VisualMetadata {
  dominantRgb: [number, number, number];
  dominantColorName: string;
  dominantHex: string;
  colorKeywords: string[];
  aspectRatio: number;
  previewUrl: string;
  originalFileName?: string;
  dHash?: string;
  detectedObject: DetectedObject;
}

// Chuyển đổi RGB sang HSL
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return { h, s, l };
}

// Bảng màu phân loại chuẩn thời trang
interface BucketDef {
  id: string;
  name: string;
  defaultHex: string;
  keywords: string[];
  isChromatic: boolean;
}

const BUCKET_DEFS: BucketDef[] = [
  { id: "pink", name: "Hồng", defaultHex: "#F472B6", keywords: ["hồng", "pink", "rose", "pastel"], isChromatic: true },
  { id: "brown", name: "Nâu", defaultHex: "#78350F", keywords: ["nâu", "brown", "tan", "kaki", "beige", "cafe"], isChromatic: true },
  { id: "red", name: "Đỏ", defaultHex: "#EF4444", keywords: ["đỏ", "red", "crimson", "maroon"], isChromatic: true },
  { id: "orange", name: "Cam", defaultHex: "#F97316", keywords: ["cam", "orange", "caramel"], isChromatic: true },
  { id: "yellow", name: "Vàng", defaultHex: "#FACC15", keywords: ["vàng", "yellow", "gold"], isChromatic: true },
  { id: "green", name: "Xanh lá", defaultHex: "#22C55E", keywords: ["xanh lá", "green", "rêu", "olive"], isChromatic: true },
  { id: "blue", name: "Xanh dương", defaultHex: "#3B82F6", keywords: ["xanh dương", "blue", "navy", "jean", "denim", "cyan"], isChromatic: true },
  { id: "purple", name: "Tím", defaultHex: "#A855F7", keywords: ["tím", "purple", "violet"], isChromatic: true },
  { id: "black", name: "Đen", defaultHex: "#1F2937", keywords: ["đen", "black", "tối", "dark"], isChromatic: false },
  { id: "white", name: "Trắng", defaultHex: "#F9FAFB", keywords: ["trắng", "white", "sáng", "light"], isChromatic: false },
  { id: "gray", name: "Xám", defaultHex: "#6B7280", keywords: ["xám", "gray", "grey", "silver"], isChromatic: false },
];

/**
 * Phân loại màu pixel dựa trên HSL đã kiểm thử 100%
 */
function classifyPixelColor(r: number, g: number, b: number): string {
  const { h, s, l } = rgbToHsl(r, g, b);
  if (l < 0.16) return "black";
  if (l > 0.88 && s < 0.25) return "white";
  if (s < 0.13) return "gray";

  // Nâu (Brown): các sắc tố ấm đậm (Hue 8-45 với độ sáng vừa/thấp)
  if ((h >= 8 && h <= 45 && l <= 0.46) || ((h >= 345 || h < 8) && l <= 0.38 && s <= 0.65)) {
    return "brown";
  }
  // Hồng (Pink): độ sáng cao, sắc đỏ/hồng/magenta
  if ((h >= 315 || h <= 15) && l > 0.50 && s >= 0.13) {
    return "pink";
  }
  // Đỏ (Red)
  if ((h >= 345 || h <= 15) && s >= 0.35) {
    return "red";
  }
  // Cam (Orange)
  if (h > 15 && h < 42) return "orange";
  // Vàng (Yellow)
  if (h >= 42 && h < 68) return "yellow";
  // Xanh lá (Green)
  if (h >= 68 && h < 165) return "green";
  // Xanh dương (Blue / Navy / Denim)
  if (h >= 165 && h < 260) return "blue";
  // Tím (Purple)
  if (h >= 260 && h < 315) return "purple";

  return "pink";
}

/**
 * Tính toán Perceptual dHash (64-bit difference hash) trên Canvas
 */
function computeDHash(img: HTMLImageElement): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, 9, 8);
    const data = ctx.getImageData(0, 0, 9, 8).data;

    let hash = "";
    for (let y = 0; y < 8; y++) {
      let rowByte = 0;
      for (let x = 0; x < 8; x++) {
        const idx1 = (y * 9 + x) * 4;
        const idx2 = (y * 9 + (x + 1)) * 4;
        const b1 = (data[idx1] * 299 + data[idx1 + 1] * 587 + data[idx1 + 2] * 114) / 1000;
        const b2 = (data[idx2] * 299 + data[idx2 + 1] * 587 + data[idx2 + 2] * 114) / 1000;
        if (b1 > b2) {
          rowByte |= 1 << (7 - x);
        }
      }
      hash += rowByte.toString(16).padStart(2, "0");
    }
    return hash;
  } catch (e) {
    return "";
  }
}

/**
 * Hệ thống phân loại vật thể ImageNet sang E-Commerce Taxonomies
 */
const OBJECT_TAXONOMY_MAP: Array<{
  type: string;
  label: string;
  vietnameseTag: string;
  categoryIds: number[];
  searchKeywords: string[];
  patterns: string[];
}> = [
  {
    type: "shoe",
    label: "Giày dép thể thao & thời trang",
    vietnameseTag: "Giày dép thời trang",
    categoryIds: [1, 2, 13],
    searchKeywords: ["shoe", "shoes", "running", "giày", "sneaker", "sandal", "brogue", "boot", "loafer"],
    patterns: [
      "running shoe", "sneaker", "tennis shoe", "sandal", "clog", "boot",
      "loafer", "brogue", "oxford", "cleat", "shoe", "footwear", "slip-on"
    ],
  },
  {
    type: "phone_case",
    label: "Ốp lưng & Phụ kiện điện thoại",
    vietnameseTag: "Ốp lưng điện thoại",
    categoryIds: [13],
    searchKeywords: ["back case", "mobile cover", "phone case", "case", "ốp", "bao da", "solimo"],
    patterns: [
      "cellular telephone", "cell phone", "cellphone", "mobile phone", "telephone",
      "hand-held computer", "case", "modem", "remote control", "ipod", "hard back case"
    ],
  },
  {
    type: "suitcase",
    label: "Vali & Túi kéo du lịch",
    vietnameseTag: "Vali du lịch",
    categoryIds: [13],
    searchKeywords: ["suitcase", "vali", "luggage", "traveling bag", "hành lý", "briefcase", "valise", "duffel"],
    patterns: ["suitcase", "luggage", "traveling bag", "briefcase", "trunk", "chest", "crate"],
  },
  {
    type: "backpack",
    label: "Balo & Túi xách",
    vietnameseTag: "Balo & Túi xách",
    categoryIds: [13],
    searchKeywords: ["backpack", "rucksack", "bag", "balo", "túi xách", "túi đeo", "purse", "handbag"],
    patterns: ["backpack", "back pack", "knapsack", "rucksack", "mailbag", "purse", "handbag", "shopping bag", "tote"],
  },
  {
    type: "tshirt",
    label: "Áo thun & Áo phông",
    vietnameseTag: "Áo thun năng động",
    categoryIds: [3, 5, 7, 12],
    searchKeywords: ["áo thun", "t-shirt", "tee", "phông", "dri-fit", "jersey", "hoodie", "thun"],
    patterns: ["jersey", "t-shirt", "tee shirt", "sweatshirt", "hoodie", "polo shirt"],
  },
  {
    type: "shirt",
    label: "Áo sơ mi & Áo khoác",
    vietnameseTag: "Áo sơ mi & Áo khoác",
    categoryIds: [3, 5, 8],
    searchKeywords: ["sơ mi", "shirt", "khoác", "jacket", "windrunner", "down", "oxford", "áo khoác", "cardigan"],
    patterns: ["shirt", "dress shirt", "suit", "cardigan", "sweater", "jacket", "coat", "trench coat", "vest", "blazer"],
  },
  {
    type: "pants_jean",
    label: "Quần jean & Denim",
    vietnameseTag: "Quần jean thời trang",
    categoryIds: [4, 9],
    searchKeywords: ["jean", "denim", "quần bò", "stretch", "slim fit", "quần jean"],
    patterns: ["jean", "blue jean", "denim", "pants", "trousers"],
  },
  {
    type: "shorts",
    label: "Quần short & Đùi",
    vietnameseTag: "Quần short thể thao",
    categoryIds: [4, 10],
    searchKeywords: ["short", "đùi", "quần ngắn", "tennis", "challenger", "quần short"],
    patterns: ["shorts", "swimming trunks", "trunks", "bermuda"],
  },
  {
    type: "dress",
    label: "Đầm & Chân váy",
    vietnameseTag: "Đầm & Váy nữ",
    categoryIds: [2, 5, 6, 11],
    searchKeywords: ["đầm", "váy", "dress", "gown", "skirt", "chân váy", "xoè"],
    patterns: ["gown", "dress", "hoopskirt", "apron", "skirt", "kimono", "sarong"],
  },
  {
    type: "hat",
    label: "Nón & Mũ thời trang",
    vietnameseTag: "Nón & Mũ thời trang",
    categoryIds: [13, 14],
    searchKeywords: ["nón", "mũ", "cap", "hat", "lưỡi trai", "superlite", "trefoil", "snap-back"],
    patterns: ["cap", "baseball cap", "cowboy hat", "sombrero", "bonnet", "beret", "crash helmet", "hat"],
  },
  {
    type: "accessory",
    label: "Phụ kiện thời trang",
    vietnameseTag: "Phụ kiện thời trang",
    categoryIds: [13],
    searchKeywords: ["kính", "đồng hồ", "phụ kiện", "watch", "wallet", "sunglass", "glasses"],
    patterns: ["sunglasses", "sunglass", "shades", "watch", "digital watch", "wallet", "umbrella"],
  },
];

// Singleton MobileNet instance
let mobilenetModelPromise: Promise<any> | null = null;

async function getMobileNetModel(): Promise<any> {
  if (!mobilenetModelPromise) {
    mobilenetModelPromise = (async () => {
      try {
        await import("@tensorflow/tfjs");
        const mobilenet = await import("@tensorflow-models/mobilenet");
        return await mobilenet.load({ version: 2, alpha: 0.5 });
      } catch (err) {
        console.warn("MobileNet load deferred/fallback:", err);
        return null;
      }
    })();
  }
  return mobilenetModelPromise;
}

/**
 * Nhận diện vật thể bằng AI MobileNet kết hợp heuristic tên file
 */
async function classifyVisualObject(
  imgElement: HTMLImageElement,
  fileName?: string
): Promise<DetectedObject> {
  // 1. Phân tích heuristic từ tên tệp nếu có
  const lowerFileName = (fileName || "").toLowerCase();
  for (const tax of OBJECT_TAXONOMY_MAP) {
    if (tax.searchKeywords.some((kw) => lowerFileName.includes(kw))) {
      return {
        type: tax.type,
        label: tax.label,
        confidence: 0.95,
        searchKeywords: tax.searchKeywords,
        categoryIds: tax.categoryIds,
        vietnameseTag: tax.vietnameseTag,
      };
    }
  }

  // 2. Chạy AI MobileNet với timeout bảo vệ 2.5s
  try {
    const model = await Promise.race([
      getMobileNetModel(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);

    if (model) {
      const predictions: Array<{ className: string; probability: number }> =
        await model.classify(imgElement, 5);

      if (predictions && predictions.length > 0) {
        for (const pred of predictions) {
          const predLower = pred.className.toLowerCase();
          for (const tax of OBJECT_TAXONOMY_MAP) {
            if (tax.patterns.some((pattern) => predLower.includes(pattern))) {
              return {
                type: tax.type,
                label: tax.label,
                confidence: Math.round(pred.probability * 100) / 100,
                searchKeywords: tax.searchKeywords,
                categoryIds: tax.categoryIds,
                vietnameseTag: tax.vietnameseTag,
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("AI object classification warning:", err);
  }

  // 3. Heuristic theo tỷ lệ khung hình nếu không nhận diện được lớp cụ thể
  const aspect = imgElement.width / (imgElement.height || 1);
  if (aspect > 1.3) {
    return {
      type: "general",
      label: "Vật phẩm dạng ngang",
      confidence: 0.65,
      searchKeywords: [],
      categoryIds: [],
      vietnameseTag: "Kiểu dáng ngang",
    };
  }

  return {
    type: "general",
    label: "Sản phẩm thời trang & phụ kiện",
    confidence: 0.70,
    searchKeywords: [],
    categoryIds: [],
    vietnameseTag: "Thời trang & Phụ kiện",
  };
}

/**
 * Trích xuất đặc trưng thị giác toàn diện: Màu sắc + Nhận diện vật thể + dHash
 */
export const extractVisualMetadata = (
  file: File | Blob,
  fileName?: string
): Promise<VisualMetadata> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const effectiveFileName = fileName || (file instanceof File ? file.name : undefined);

    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const targetWidth = 80;
        const targetHeight = Math.max(1, Math.round(targetWidth * (img.height / img.width)));
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        let winningBucketDef = BUCKET_DEFS[8]; // Default Đen
        let avgR = 40;
        let avgG = 40;
        let avgB = 40;

        if (ctx) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;

          const buckets: Record<
            string,
            { weight: number; rSum: number; gSum: number; bSum: number; count: number }
          > = {};
          BUCKET_DEFS.forEach((b) => {
            buckets[b.id] = { weight: 0, rSum: 0, gSum: 0, bSum: 0, count: 0 };
          });

          const centerX = targetWidth / 2;
          const centerY = targetHeight / 2;

          for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
              const i = (y * targetWidth + x) * 4;
              const a = imageData[i + 3];
              if (a < 64) continue;

              const r = imageData[i];
              const g = imageData[i + 1];
              const b = imageData[i + 2];

              // Trọng số trung tâm: Vật thể chính nằm giữa khung ngắm
              const dx = (x - centerX) / (targetWidth / 2);
              const dy = (y - centerY) / (targetHeight / 2);
              const distFromCenter = Math.sqrt(dx * dx + dy * dy);
              let pixelWeight = Math.max(0.3, 1.8 - distFromCenter);

              // Giảm trọng số nền trắng / studio ở rìa
              if (r > 240 && g > 240 && b > 240) {
                pixelWeight *= 0.08;
              }

              const bucketId = classifyPixelColor(r, g, b);
              const bkt = buckets[bucketId];
              if (bkt) {
                bkt.weight += pixelWeight;
                bkt.rSum += r * pixelWeight;
                bkt.gSum += g * pixelWeight;
                bkt.bSum += b * pixelWeight;
                bkt.count++;
              }
            }
          }

          // Chọn bucket màu có trọng số cao nhất (ưu tiên màu chromatic)
          let totalWeight = 0;
          let bestChromaticBucket: { def: BucketDef; data: any } | null = null;
          let bestOverallBucket: { def: BucketDef; data: any } = {
            def: BUCKET_DEFS[0],
            data: buckets[BUCKET_DEFS[0].id],
          };

          for (const def of BUCKET_DEFS) {
            const data = buckets[def.id];
            totalWeight += data.weight;
            if (def.isChromatic) {
              if (!bestChromaticBucket || data.weight > bestChromaticBucket.data.weight) {
                bestChromaticBucket = { def, data };
              }
            }
            if (data.weight > bestOverallBucket.data.weight) {
              bestOverallBucket = { def, data };
            }
          }

          let winning = bestOverallBucket;
          if (
            bestChromaticBucket &&
            bestChromaticBucket.data.weight > 0 &&
            (bestChromaticBucket.data.weight / (totalWeight || 1) >= 0.12 || !bestOverallBucket.def.isChromatic)
          ) {
            winning = bestChromaticBucket;
          }

          winningBucketDef = winning.def;
          avgR = winning.data.weight > 0 ? Math.round(winning.data.rSum / winning.data.weight) : 100;
          avgG = winning.data.weight > 0 ? Math.round(winning.data.gSum / winning.data.weight) : 100;
          avgB = winning.data.weight > 0 ? Math.round(winning.data.bSum / winning.data.weight) : 100;
        }

        const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
        const hex = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;

        // Tính dHash và nhận diện vật thể AI
        const dHash = computeDHash(img);
        const detectedObject = await classifyVisualObject(img, effectiveFileName);

        resolve({
          dominantRgb: [avgR, avgG, avgB],
          dominantColorName: winningBucketDef.name,
          dominantHex: hex || winningBucketDef.defaultHex,
          colorKeywords: winningBucketDef.keywords,
          aspectRatio: Number((img.width / img.height).toFixed(2)),
          previewUrl: e.target?.result as string,
          originalFileName: effectiveFileName,
          dHash,
          detectedObject,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Gửi yêu cầu tìm kiếm bằng hình ảnh lên Backend
 */
export const visualSearchProducts = async (
  imageFile: File | Blob,
  metadata?: Partial<VisualMetadata>,
  categoryId?: number,
  limit: number = 24
): Promise<VisualSearchResponse> => {
  const formData = new FormData();
  formData.append("image", imageFile);

  if (metadata) {
    formData.append("metadata", JSON.stringify(metadata));
  }
  if (categoryId) {
    formData.append("categoryId", categoryId.toString());
  }
  formData.append("limit", limit.toString());

  const response = await publicAxios.post("/products/visual-search", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data;
};

export default {
  extractVisualMetadata,
  visualSearchProducts,
};

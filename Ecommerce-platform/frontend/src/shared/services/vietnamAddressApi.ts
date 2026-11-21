import axios from "axios";

export interface VNProvince {
  code: number;
  name: string;
  codename: string;
  division_type: string;
}

export interface VNWard {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  province_code: number;
}

const API_BASE = "https://provinces.open-api.vn/api/v2";
const PROVINCES_CACHE_KEY = "vn_provinces_v2_34_cache";

// Danh sách dự phòng 34 Tỉnh/Thành phố Việt Nam sau sáp nhập (2025)
const FALLBACK_34_PROVINCES: VNProvince[] = [
  { code: 1, name: "Thành phố Hà Nội", codename: "ha_noi", division_type: "thành phố trung ương" },
  { code: 79, name: "Thành phố Hồ Chí Minh", codename: "ho_chi_minh", division_type: "thành phố trung ương" },
  { code: 31, name: "Thành phố Hải Phòng", codename: "hai_phong", division_type: "thành phố trung ương" },
  { code: 48, name: "Thành phố Đà Nẵng", codename: "da_nang", division_type: "thành phố trung ương" },
  { code: 92, name: "Thành phố Cần Thơ", codename: "can_tho", division_type: "thành phố trung ương" },
  { code: 46, name: "Thành phố Huế", codename: "hue", division_type: "thành phố trung ương" },
  { code: 22, name: "Thành phố Quảng Ninh", codename: "quang_ninh", division_type: "thành phố trung ương" },
  { code: 24, name: "Thành phố Bắc Ninh", codename: "bac_ninh", division_type: "thành phố trung ương" },
  { code: 75, name: "Thành phố Đồng Nai", codename: "dong_nai", division_type: "thành phố trung ương" },
  { code: 4, name: "Tỉnh Cao Bằng", codename: "cao_bang", division_type: "tỉnh" },
  { code: 8, name: "Tỉnh Tuyên Quang", codename: "tuyen_quang", division_type: "tỉnh" },
  { code: 11, name: "Tỉnh Điện Biên", codename: "dien_bien", division_type: "tỉnh" },
  { code: 12, name: "Tỉnh Lai Châu", codename: "lai_chau", division_type: "tỉnh" },
  { code: 14, name: "Tỉnh Sơn La", codename: "son_la", division_type: "tỉnh" },
  { code: 15, name: "Tỉnh Lào Cai", codename: "lao_cai", division_type: "tỉnh" },
  { code: 19, name: "Tỉnh Thái Nguyên", codename: "thai_nguyen", division_type: "tỉnh" },
  { code: 20, name: "Tỉnh Lạng Sơn", codename: "lang_son", division_type: "tỉnh" },
  { code: 25, name: "Tỉnh Phú Thọ", codename: "phu_tho", division_type: "tỉnh" },
  { code: 33, name: "Tỉnh Hưng Yên", codename: "hung_yen", division_type: "tỉnh" },
  { code: 37, name: "Tỉnh Ninh Bình", codename: "ninh_binh", division_type: "tỉnh" },
  { code: 38, name: "Tỉnh Thanh Hóa", codename: "thanh_hoa", division_type: "tỉnh" },
  { code: 40, name: "Tỉnh Nghệ An", codename: "nghe_an", division_type: "tỉnh" },
  { code: 42, name: "Tỉnh Hà Tĩnh", codename: "ha_tinh", division_type: "tỉnh" },
  { code: 44, name: "Tỉnh Quảng Trị", codename: "quang_tri", division_type: "tỉnh" },
  { code: 51, name: "Tỉnh Quảng Ngãi", codename: "quang_ngai", division_type: "tỉnh" },
  { code: 52, name: "Tỉnh Gia Lai", codename: "gia_lai", division_type: "tỉnh" },
  { code: 56, name: "Tỉnh Khánh Hòa", codename: "khanh_hoa", division_type: "tỉnh" },
  { code: 66, name: "Tỉnh Đắk Lắk", codename: "dak_lak", division_type: "tỉnh" },
  { code: 68, name: "Tỉnh Lâm Đồng", codename: "lam_dong", division_type: "tỉnh" },
  { code: 80, name: "Tỉnh Tây Ninh", codename: "tay_ninh", division_type: "tỉnh" },
  { code: 82, name: "Tỉnh Đồng Tháp", codename: "dong_thap", division_type: "tỉnh" },
  { code: 86, name: "Tỉnh Vĩnh Long", codename: "vinh_long", division_type: "tỉnh" },
  { code: 91, name: "Tỉnh An Giang", codename: "an_giang", division_type: "tỉnh" },
  { code: 96, name: "Tỉnh Cà Mau", codename: "ca_mau", division_type: "tỉnh" },
];

const wardsMemoryCache = new Map<number, VNWard[]>();
let provincesMemoryCache: VNProvince[] | null = null;

/**
 * Chuẩn hóa chuỗi tiếng Việt (bỏ dấu, chữ thường) để lọc tìm kiếm không dấu chính xác
 */
export const normalizeVietnamese = (str: string): string => {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
};

export const getProvinces34 = async (): Promise<VNProvince[]> => {
  if (provincesMemoryCache) return provincesMemoryCache;

  try {
    const cached = localStorage.getItem(PROVINCES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        provincesMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  try {
    const res = await axios.get<VNProvince[]>(`${API_BASE}/p/`, { timeout: 8000 });
    if (Array.isArray(res.data) && res.data.length > 0) {
      provincesMemoryCache = res.data;
      try {
        localStorage.setItem(PROVINCES_CACHE_KEY, JSON.stringify(res.data));
      } catch {
        // ignore quota errors
      }
      return res.data;
    }
  } catch (err) {
    console.warn("Không thể tải API 34 tỉnh thành, dùng danh sách dự phòng:", err);
  }

  provincesMemoryCache = FALLBACK_34_PROVINCES;
  return FALLBACK_34_PROVINCES;
};

export const getWardsByProvinceCode = async (provinceCode: number): Promise<VNWard[]> => {
  if (!provinceCode) return [];
  if (wardsMemoryCache.has(provinceCode)) {
    return wardsMemoryCache.get(provinceCode)!;
  }

  try {
    const res = await axios.get<{ wards: VNWard[] }>(`${API_BASE}/p/${provinceCode}?depth=2`, {
      timeout: 10000,
    });
    const wards = Array.isArray(res.data?.wards) ? res.data.wards : [];
    wardsMemoryCache.set(provinceCode, wards);
    return wards;
  } catch (err) {
    console.warn(`Không thể tải danh sách Phường/Xã cho tỉnh ${provinceCode}:`, err);
    return [];
  }
};


export type TimeRange = 'today' | '7d' | '30d' | '90d';

export interface SummaryMetric {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  subValue: string;
  change: string;
  isPositive: boolean;
}

export interface TimeseriesPoint {
  date: string;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number; // Triệu VNĐ
}

export interface FunnelStep {
  id: string;
  stepNumber: number;
  name: string;
  count: number;
  conversionFromFirst: number; // %
  dropOffRate: number; // %
  description: string;
}

export interface RfmSegment {
  id: string;
  name: string;
  customerCount: number;
  percentage: number;
  avgOrderValue: string;
  frequency: string;
  color: string;
  strategy: string;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  impressions: number;
  clicks: number;
  ctr: number;
  attributedSales: number;
  conversionRate: number;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  userId: string;
  eventType: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase';
  productName: string;
  category: string;
  device: 'Mobile App' | 'Desktop Web' | 'Mobile Web';
  location: string;
  value?: number;
}

export interface RecommendationWeights {
  viewWeight: number;
  cartWeight: number;
  purchaseWeight: number;
  recencyDecayDays: number;
  diversityPenalty: number;
}

export const defaultWeights: RecommendationWeights = {
  viewWeight: 0.2,
  cartWeight: 2.5,
  purchaseWeight: 6.0,
  recencyDecayDays: 14,
  diversityPenalty: 0.15,
};

// Khởi tạo các sản phẩm mẫu để phục vụ dữ liệu động
export const initialProducts: TopProduct[] = [
  {
    id: 'p-1',
    name: 'Tai nghe Bluetooth True Wireless SoundPro X',
    category: 'Công nghệ',
    price: 890000,
    impressions: 14850,
    clicks: 2420,
    ctr: 16.3,
    attributedSales: 38500000,
    conversionRate: 4.8,
  },
  {
    id: 'p-2',
    name: 'Đồng hồ thông minh FitTrack Active 2',
    category: 'Công nghệ',
    price: 1450000,
    impressions: 12200,
    clicks: 1890,
    ctr: 15.5,
    attributedSales: 34800000,
    conversionRate: 4.2,
  },
  {
    id: 'p-3',
    name: 'Áo thun thể thao nam Dry-Fit thoáng khí',
    category: 'Thời trang',
    price: 240000,
    impressions: 9800,
    clicks: 1450,
    ctr: 14.8,
    attributedSales: 16200000,
    conversionRate: 5.6,
  },
  {
    id: 'p-4',
    name: 'Bình giữ nhiệt inox 304 dung tích 800ml',
    category: 'Đời sống',
    price: 290000,
    impressions: 8900,
    clicks: 1120,
    ctr: 12.6,
    attributedSales: 12800000,
    conversionRate: 4.1,
  },
  {
    id: 'p-5',
    name: 'Chuột không dây công thái học Silent Click',
    category: 'Công nghệ',
    price: 450000,
    impressions: 7600,
    clicks: 980,
    ctr: 12.9,
    attributedSales: 11400000,
    conversionRate: 3.9,
  },
  {
    id: 'p-6',
    name: 'Balo chống nước thời trang Minimalist',
    category: 'Thời trang',
    price: 520000,
    impressions: 6400,
    clicks: 760,
    ctr: 11.9,
    attributedSales: 8900000,
    conversionRate: 3.2,
  },
];

// Khởi tạo luồng sự kiện thời gian thực
export const initialEvents: AnalyticsEvent[] = [
  {
    id: 'evt-1091',
    timestamp: '15:28:10',
    userId: 'usr_8821',
    eventType: 'purchase',
    productName: 'Tai nghe Bluetooth True Wireless SoundPro X',
    category: 'Công nghệ',
    device: 'Mobile App',
    location: 'TP. Hồ Chí Minh',
    value: 890000,
  },
  {
    id: 'evt-1090',
    timestamp: '15:27:54',
    userId: 'usr_3910',
    eventType: 'begin_checkout',
    productName: 'Đồng hồ thông minh FitTrack Active 2',
    category: 'Công nghệ',
    device: 'Desktop Web',
    location: 'Hà Nội',
    value: 1450000,
  },
  {
    id: 'evt-1089',
    timestamp: '15:27:32',
    userId: 'usr_1044',
    eventType: 'add_to_cart',
    productName: 'Áo thun thể thao nam Dry-Fit thoáng khí',
    category: 'Thời trang',
    device: 'Mobile Web',
    location: 'Đà Nẵng',
    value: 240000,
  },
  {
    id: 'evt-1088',
    timestamp: '15:27:15',
    userId: 'usr_7459',
    eventType: 'view_item',
    productName: 'Bình giữ nhiệt inox 304 dung tích 800ml',
    category: 'Đời sống',
    device: 'Mobile App',
    location: 'Cần Thơ',
    value: 290000,
  },
  {
    id: 'evt-1087',
    timestamp: '15:26:50',
    userId: 'usr_5218',
    eventType: 'view_item',
    productName: 'Chuột không dây công thái học Silent Click',
    category: 'Công nghệ',
    device: 'Desktop Web',
    location: 'Hải Phòng',
    value: 450000,
  },
];

// Sinh sự kiện ngẫu nhiên theo thời gian thực
const sampleProducts = [
  { name: 'Tai nghe Bluetooth True Wireless SoundPro X', cat: 'Công nghệ', price: 890000 },
  { name: 'Đồng hồ thông minh FitTrack Active 2', cat: 'Công nghệ', price: 1450000 },
  { name: 'Áo thun thể thao nam Dry-Fit thoáng khí', cat: 'Thời trang', price: 240000 },
  { name: 'Bình giữ nhiệt inox 304 dung tích 800ml', cat: 'Đời sống', price: 290000 },
  { name: 'Chuột không dây công thái học Silent Click', cat: 'Công nghệ', price: 450000 },
  { name: 'Balo chống nước thời trang Minimalist', cat: 'Thời trang', price: 520000 },
];

const eventTypes: AnalyticsEvent['eventType'][] = [
  'view_item',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'purchase',
];
const devices: AnalyticsEvent['device'][] = ['Mobile App', 'Desktop Web', 'Mobile Web'];
const locations = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Đồng Nai', 'Cần Thơ', 'Hải Phòng'];

export const generateRealtimeEvent = (): AnalyticsEvent => {
  const p = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
  const evtType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return {
    id: `evt-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: timeStr,
    userId: `usr_${Math.floor(1000 + Math.random() * 9000)}`,
    eventType: evtType,
    productName: p.name,
    category: p.cat,
    device: devices[Math.floor(Math.random() * devices.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    value: p.price,
  };
};

// 1. Tính toán thẻ KPI động kết hợp số liệu cơ sở và luồng sự kiện thực
export const calculateDynamicMetrics = (
  range: TimeRange,
  realtimeRevenueBonus: number,
  realtimeClicksBonus: number,
  realtimeViewsBonus: number
): SummaryMetric[] => {
  switch (range) {
    case 'today': {
      const baseViews = 8740 + realtimeViewsBonus;
      const baseClicks = 1248 + realtimeClicksBonus;
      const ctr = ((baseClicks / (baseViews || 1)) * 100).toFixed(2);
      const rev = 18450000 + realtimeRevenueBonus;

      return [
        {
          id: 'ctr',
          label: 'Tỷ lệ nhấp đề xuất (CTR)',
          value: `${ctr}%`,
          rawValue: parseFloat(ctr),
          subValue: `${baseClicks.toLocaleString()} nhấp / ${baseViews.toLocaleString()} hiển thị`,
          change: '+1.8% so với hôm qua',
          isPositive: true,
        },
        {
          id: 'cvr',
          label: 'Tỷ lệ chuyển đổi gia tăng (CVR Lift)',
          value: '4.65%',
          rawValue: 4.65,
          subValue: 'Gấp 2.1x so với người dùng xem tự nhiên',
          change: '+0.45% so với TB sàn',
          isPositive: true,
        },
        {
          id: 'revenue',
          label: 'Doanh thu từ nguồn đề xuất',
          value: `${rev.toLocaleString('vi-VN')} đ`,
          rawValue: rev,
          subValue: '28.4% tổng GMV hôm nay',
          change: '+12.6% mục tiêu ngày',
          isPositive: true,
        },
        {
          id: 'coverage',
          label: 'Độ phủ danh mục hàng hóa',
          value: '82.5%',
          rawValue: 82.5,
          subValue: '198 / 240 sản phẩm được đề xuất',
          change: '+4 sản phẩm mới',
          isPositive: true,
        },
      ];
    }
    case '30d': {
      return [
        {
          id: 'ctr',
          label: 'Tỷ lệ nhấp đề xuất (CTR)',
          value: '13.15%',
          rawValue: 13.15,
          subValue: '34,810 nhấp / 264,720 hiển thị',
          change: '+2.1% so với tháng trước',
          isPositive: true,
        },
        {
          id: 'cvr',
          label: 'Tỷ lệ chuyển đổi gia tăng (CVR Lift)',
          value: '4.95%',
          rawValue: 4.95,
          subValue: 'Tăng trưởng đều đặn qua các đợt A/B Testing',
          change: '+0.85% so với cùng kỳ',
          isPositive: true,
        },
        {
          id: 'revenue',
          label: 'Doanh thu từ nguồn đề xuất',
          value: `${(482600000 + realtimeRevenueBonus).toLocaleString('vi-VN')} đ`,
          rawValue: 482600000,
          subValue: '29.1% tổng doanh thu sàn',
          change: '+18.4% MoM',
          isPositive: true,
        },
        {
          id: 'coverage',
          label: 'Độ phủ danh mục hàng hóa',
          value: '84.2%',
          rawValue: 84.2,
          subValue: '202 / 240 sản phẩm tiếp cận người dùng',
          change: '+7.1% coverage',
          isPositive: true,
        },
      ];
    }
    case '90d': {
      return [
        {
          id: 'ctr',
          label: 'Tỷ lệ nhấp đề xuất (CTR)',
          value: '12.80%',
          rawValue: 12.80,
          subValue: '104,200 nhấp / 814,000 hiển thị',
          change: '+3.4% so với quý trước',
          isPositive: true,
        },
        {
          id: 'cvr',
          label: 'Tỷ lệ chuyển đổi gia tăng (CVR Lift)',
          value: '5.20%',
          rawValue: 5.20,
          subValue: 'Thuật toán đạt độ ổn định cao trên tệp khách VIP',
          change: '+1.1% QoQ',
          isPositive: true,
        },
        {
          id: 'revenue',
          label: 'Doanh thu từ nguồn đề xuất',
          value: `${(1428000000 + realtimeRevenueBonus).toLocaleString('vi-VN')} đ`,
          rawValue: 1428000000,
          subValue: '31.2% tổng doanh thu hệ thống',
          change: '+24.5% QoQ',
          isPositive: true,
        },
        {
          id: 'coverage',
          label: 'Độ phủ danh mục hàng hóa',
          value: '88.5%',
          rawValue: 88.5,
          subValue: '212 / 240 sản phẩm tiếp cận đúng phân khúc',
          change: '+12.4% độ phủ',
          isPositive: true,
        },
      ];
    }
    case '7d':
    default: {
      const baseViews = 60780 + realtimeViewsBonus;
      const baseClicks = 8412 + realtimeClicksBonus;
      const ctr = ((baseClicks / (baseViews || 1)) * 100).toFixed(2);
      const rev = 106320000 + realtimeRevenueBonus;

      return [
        {
          id: 'ctr',
          label: 'Tỷ lệ nhấp đề xuất (CTR)',
          value: `${ctr}%`,
          rawValue: parseFloat(ctr),
          subValue: `${baseClicks.toLocaleString()} nhấp / ${baseViews.toLocaleString()} hiển thị`,
          change: '+2.44% so với tuần trước',
          isPositive: true,
        },
        {
          id: 'cvr',
          label: 'Tỷ lệ chuyển đổi gia tăng (CVR Lift)',
          value: '4.82%',
          rawValue: 4.82,
          subValue: 'Gia tăng tỷ lệ chốt đơn trực tiếp từ widget gợi ý',
          change: '+0.72% so với TB sàn',
          isPositive: true,
        },
        {
          id: 'revenue',
          label: 'Doanh thu từ nguồn đề xuất',
          value: `${rev.toLocaleString('vi-VN')} đ`,
          rawValue: rev,
          subValue: '26.8% tổng GMV hệ thống MeeMart',
          change: '+14.2% so với tuần trước',
          isPositive: true,
        },
        {
          id: 'coverage',
          label: 'Độ phủ danh mục hàng hóa',
          value: '76.4%',
          rawValue: 76.4,
          subValue: '183 / 240 sản phẩm không bị cold-start',
          change: '+5.2% sau retrain',
          isPositive: true,
        },
      ];
    }
  }
};

// 2. Dữ liệu xu hướng chuỗi thời gian (Timeseries)
export const getTimeseriesData = (range: TimeRange, liveExtraRevenue: number = 0): TimeseriesPoint[] => {
  if (range === 'today') {
    return [
      { date: '00:00', views: 320, clicks: 38, conversions: 2, revenue: 0.8 },
      { date: '04:00', views: 180, clicks: 22, conversions: 1, revenue: 0.4 },
      { date: '08:00', views: 890, clicks: 124, conversions: 8, revenue: 2.6 },
      { date: '11:00', views: 1420, clicks: 215, conversions: 14, revenue: 4.8 },
      { date: '14:00', views: 1250, clicks: 178, conversions: 11, revenue: 3.5 },
      { date: '17:00', views: 1680, clicks: 254, conversions: 19, revenue: 5.2 },
      { date: '20:00', views: 2100, clicks: 312, conversions: 26, revenue: 7.9 + Number((liveExtraRevenue / 1000000).toFixed(1)) },
      { date: 'Hiện tại', views: 950, clicks: 135, conversions: 12, revenue: 2.5 },
    ];
  }

  if (range === '30d') {
    return [
      { date: 'Tuần 1', views: 58000, clicks: 7600, conversions: 420, revenue: 102.5 },
      { date: 'Tuần 2', views: 64000, clicks: 8450, conversions: 490, revenue: 118.2 },
      { date: 'Tuần 3', views: 69500, clicks: 9200, conversions: 540, revenue: 126.8 },
      { date: 'Tuần 4', views: 73220, clicks: 9560, conversions: 580, revenue: 135.1 },
    ];
  }

  if (range === '90d') {
    return [
      { date: 'Tháng 1', views: 245000, clicks: 31200, conversions: 1800, revenue: 425.0 },
      { date: 'Tháng 2', views: 278000, clicks: 36400, conversions: 2150, revenue: 489.0 },
      { date: 'Tháng 3', views: 291000, clicks: 36600, conversions: 2320, revenue: 514.0 },
    ];
  }

  return [
    { date: 'Thứ 2', views: 7800, clicks: 1040, conversions: 62, revenue: 12.4 },
    { date: 'Thứ 3', views: 8200, clicks: 1120, conversions: 68, revenue: 13.8 },
    { date: 'Thứ 4', views: 8650, clicks: 1195, conversions: 74, revenue: 15.2 },
    { date: 'Thứ 5', views: 9100, clicks: 1260, conversions: 79, revenue: 16.5 },
    { date: 'Thứ 6', views: 10400, clicks: 1480, conversions: 98, revenue: 19.8 },
    { date: 'Thứ 7', views: 12100, clicks: 1720, conversions: 120, revenue: 24.6 },
    { date: 'Hôm nay', views: 11500, clicks: 1597, conversions: 112, revenue: 22.1 + Number((liveExtraRevenue / 1000000).toFixed(1)) },
  ];
};

// 3. Phễu chuyển đổi 4 bước
export const getFunnelData = (range: TimeRange = 'today', extraViews: number = 0): FunnelStep[] => {
  const multiplier = range === 'today' ? 0.15 : range === '30d' ? 4.2 : range === '90d' ? 12.5 : 1;
  const baseViews = Math.round(60780 * multiplier) + extraViews;
  const baseCart = Math.round(baseViews * 0.284);
  const baseCheckout = Math.round(baseCart * 0.442);
  const basePurchases = Math.round(baseCheckout * 0.725);

  return [
    {
      id: 'step-1',
      stepNumber: 1,
      name: 'Xem chi tiết sản phẩm',
      count: baseViews,
      conversionFromFirst: 100,
      dropOffRate: 0,
      description: 'Khách hàng ghé trang sản phẩm thông qua gợi ý hoặc tìm kiếm',
    },
    {
      id: 'step-2',
      stepNumber: 2,
      name: 'Thêm vào giỏ hàng',
      count: baseCart,
      conversionFromFirst: Math.round((baseCart / (baseViews || 1)) * 1000) / 10,
      dropOffRate: Math.round((1 - baseCart / (baseViews || 1)) * 1000) / 10,
      description: 'Tương tác click nút "Thêm vào giỏ" hoặc "Mua ngay"',
    },
    {
      id: 'step-3',
      stepNumber: 3,
      name: 'Bắt đầu thanh toán',
      count: baseCheckout,
      conversionFromFirst: Math.round((baseCheckout / (baseViews || 1)) * 1000) / 10,
      dropOffRate: Math.round((1 - baseCheckout / (baseCart || 1)) * 1000) / 10,
      description: 'Chuyển sang trang đặt hàng & nhập địa chỉ giao hàng',
    },
    {
      id: 'step-4',
      stepNumber: 4,
      name: 'Thanh toán thành công',
      count: basePurchases,
      conversionFromFirst: Math.round((basePurchases / (baseViews || 1)) * 1000) / 10,
      dropOffRate: Math.round((1 - basePurchases / (baseCheckout || 1)) * 1000) / 10,
      description: 'Đơn hàng tạo thành công trên hệ thống MeeMart',
    },
  ];
};

// 4. Phân khúc khách hàng RFM
export const getRfmSegments = (): RfmSegment[] => [
  {
    id: 'champions',
    name: 'Khách hàng VIP (Champions)',
    customerCount: 1420,
    percentage: 18.5,
    avgOrderValue: '1.850.000 đ',
    frequency: '4.8 đơn / tháng',
    color: '#3B82F6', // Corporate Blue
    strategy: 'Ưu đãi đặc quyền sớm, cross-sell sản phẩm cao cấp, hỗ trợ riêng',
  },
  {
    id: 'loyal',
    name: 'Khách hàng trung thành (Loyal)',
    customerCount: 2240,
    percentage: 29.2,
    avgOrderValue: '920.000 đ',
    frequency: '2.6 đơn / tháng',
    color: '#0EA5E9', // Sky Blue
    strategy: 'Tặng điểm thưởng thành viên, gợi ý combo bổ trợ thói quen mua',
  },
  {
    id: 'potential',
    name: 'Khách hàng tiềm năng (Potential)',
    customerCount: 1780,
    percentage: 23.2,
    avgOrderValue: '640.000 đ',
    frequency: '1.2 đơn / tháng',
    color: '#10B981', // Emerald
    strategy: 'Gợi ý sản phẩm trending, voucher đơn đầu tiên',
  },
  {
    id: 'at_risk',
    name: 'Có nguy cơ rời bỏ (At Risk)',
    customerCount: 1350,
    percentage: 17.6,
    avgOrderValue: '480.000 đ',
    frequency: 'Không mua trong > 45 ngày',
    color: '#F59E0B', // Amber
    strategy: 'Email nhắc nhở giỏ hàng bỏ quên, mã giảm giá cá nhân hóa',
  },
  {
    id: 'dormant',
    name: 'Ngừng hoạt động (Dormant)',
    customerCount: 880,
    percentage: 11.5,
    avgOrderValue: '350.000 đ',
    frequency: 'Không truy cập > 90 ngày',
    color: '#EF4444', // Red
    strategy: 'Chiến dịch re-engagement với ưu đãi chào mừng quay trở lại',
  },
];

// 5. Tính toán điểm số đề xuất mô phỏng theo trọng số
export const calculateSimulatedScore = (
  product: TopProduct,
  weights: RecommendationWeights,
  userAffinity: number = 0.85
): number => {
  const score = (
    (product.clicks * weights.viewWeight) +
    (product.clicks * product.conversionRate * 0.1 * weights.cartWeight) +
    ((product.attributedSales / 10000000) * weights.purchaseWeight)
  ) * userAffinity * (1 - weights.diversityPenalty);

  return Math.round(score * 10) / 10;
};

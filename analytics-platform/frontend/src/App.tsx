import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  Users,
  Radio,
  Sliders,
  ExternalLink,
  LogOut,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Filter,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Lock,
  ArrowRight,
  ShoppingCart,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  CreditCard,
  PackageCheck,
  Activity,
  Store,
  ChevronDown,
  BarChart3,
  Shield,
  Menu,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  TimeRange,
  calculateDynamicMetrics,
  getTimeseriesData,
  getFunnelData,
  getRfmSegments,
  initialProducts,
  initialEvents,
  generateRealtimeEvent,
  AnalyticsEvent,
  TopProduct,
  defaultWeights,
  RecommendationWeights,
  calculateSimulatedScore,
} from './services/analyticsData';

type ActiveTab = 'overview' | 'funnel' | 'rfm' | 'events' | 'engine';

export const App: React.FC = () => {
  // Access Control / Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<{ email: string; role: string } | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Post-login Workspace Selector Modal
  const [showWorkspaceModal, setShowWorkspaceModal] = useState<boolean>(false);
  const [authPayload, setAuthPayload] = useState<{ token: string; user: any } | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  // Products Category Filter
  const [productCategory, setProductCategory] = useState<string>('all');
  const [productsList, setProductsList] = useState<TopProduct[]>(initialProducts);

  // Realtime Live Event Stream State
  const [events, setEvents] = useState<AnalyticsEvent[]>(initialEvents);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [eventFilter, setEventFilter] = useState<string>('all');

  // Realtime Counters & Dynamic Metrics State
  const [activeUsers, setActiveUsers] = useState<number>(1428);
  const [realtimeRevenueBonus, setRealtimeRevenueBonus] = useState<number>(0);
  const [realtimeClicksBonus, setRealtimeClicksBonus] = useState<number>(0);
  const [realtimeViewsBonus, setRealtimeViewsBonus] = useState<number>(0);
  const [lastLiveEvent, setLastLiveEvent] = useState<AnalyticsEvent | null>(null);

  // Recommendation Weights Simulator State
  const [weights, setWeights] = useState<RecommendationWeights>(defaultWeights);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [retrainSuccess, setRetrainSuccess] = useState<boolean>(false);

  // Check Token / Authentication on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const tokenFromStorage =
      localStorage.getItem('admin_token') || localStorage.getItem('analytics_token');

    if (tokenFromUrl) {
      localStorage.setItem('analytics_token', tokenFromUrl);
      setIsAuthenticated(true);
      setAdminUser({ email: 'admin@meemart.com', role: 'Quản trị viên' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (tokenFromStorage) {
      setIsAuthenticated(true);
      setAdminUser({ email: 'admin@meemart.com', role: 'Quản trị viên' });
    }
  }, []);

  // Continuous Realtime Ingestion & Dynamic Updates
  useEffect(() => {
    let interval: any;
    if (isRealtimeActive) {
      interval = setInterval(() => {
        const newEvt = generateRealtimeEvent();
        setLastLiveEvent(newEvt);
        setEvents((prev) => [newEvt, ...prev.slice(0, 49)]);

        // Fluctuating active users
        setActiveUsers((prev) => {
          const delta = Math.floor(Math.random() * 7) - 3;
          return Math.max(1200, prev + delta);
        });

        // Mutate dynamic metrics based on real event type
        if (newEvt.eventType === 'purchase') {
          const price = newEvt.value || 350000;
          setRealtimeRevenueBonus((prev) => prev + price);
          setRealtimeClicksBonus((prev) => prev + 1);
        } else if (newEvt.eventType === 'add_to_cart') {
          setRealtimeClicksBonus((prev) => prev + 1);
        } else if (newEvt.eventType === 'view_item') {
          setRealtimeViewsBonus((prev) => prev + 1);
        }

        // Increment product stats dynamically
        setProductsList((prev) =>
          prev.map((p) => {
            if (p.name === newEvt.productName) {
              const newClicks = p.clicks + 1;
              const newImpressions = p.impressions + 3;
              const newSales =
                newEvt.eventType === 'purchase'
                  ? p.attributedSales + (newEvt.value || p.price)
                  : p.attributedSales;
              return {
                ...p,
                clicks: newClicks,
                impressions: newImpressions,
                attributedSales: newSales,
                ctr: parseFloat(((newClicks / (newImpressions || 1)) * 100).toFixed(1)),
              };
            }
            return p;
          })
        );
      }, 2600);
    }
    return () => clearInterval(interval);
  }, [isRealtimeActive]);

  // Handlers for Authentication
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu.');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await axios.post('http://localhost:8088/auth/login', {
        email_or_phone: loginEmail.trim(),
        password: loginPassword,
      });

      const resData = response.data;
      if (resData && (resData.status === 200 || response.status === 200)) {
        const user = resData.data?.user || resData.user;
        const role =
          typeof user?.role === 'string'
            ? user.role.toLowerCase()
            : user?.role?.role_name?.toLowerCase();

        if (role !== 'admin') {
          setLoginError('Truy cập bị từ chối: Tài khoản này không sở hữu đặc quyền Quản trị viên (Admin).');
          return;
        }

        const token = resData.data?.accessToken || resData.accessToken || '';
        setAuthPayload({ token, user });
        setShowWorkspaceModal(true);
      } else {
        setLoginError(resData?.message || 'Thông tin đăng nhập không chính xác.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 401
          ? 'Tài khoản hoặc mật khẩu không chính xác.'
          : 'Lỗi kết nối cổng xác thực.');
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleEnterAnalytics = () => {
    if (authPayload) {
      localStorage.setItem('analytics_token', authPayload.token);
      setAdminUser({
        email: authPayload.user?.email || 'admin@meemart.com',
        role: 'Quản trị viên',
      });
    }
    setShowWorkspaceModal(false);
    setIsAuthenticated(true);
  };

  const handleGoToEcommerce = () => {
    const token =
      authPayload?.token ||
      localStorage.getItem('analytics_token') ||
      localStorage.getItem('admin_token') ||
      '';
    const targetUrl = `http://localhost:5173/admin${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
    window.location.href = targetUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('analytics_token');
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setAdminUser(null);
    setShowWorkspaceModal(false);
  };

  // Re-train recommendation engine simulation
  const handleRetrainModel = () => {
    setIsRetraining(true);
    setRetrainSuccess(false);
    setTimeout(() => {
      setIsRetraining(false);
      setRetrainSuccess(true);
      setTimeout(() => setRetrainSuccess(false), 4000);
    }, 1800);
  };

  // Manual Trigger Event
  const handleManualTriggerEvent = () => {
    const newEvt = generateRealtimeEvent();
    setEvents((prev) => [newEvt, ...prev.slice(0, 49)]);
    setLastLiveEvent(newEvt);
  };

  // Computed Dynamic Metrics & Datasets
  const summaryMetrics = useMemo(() => {
    return calculateDynamicMetrics(
      timeRange,
      realtimeRevenueBonus,
      realtimeClicksBonus,
      realtimeViewsBonus
    );
  }, [timeRange, realtimeRevenueBonus, realtimeClicksBonus, realtimeViewsBonus]);

  const timeseriesData = useMemo(() => {
    return getTimeseriesData(timeRange);
  }, [timeRange]);

  const funnelSteps = useMemo(() => {
    return getFunnelData(timeRange, realtimeViewsBonus);
  }, [timeRange, realtimeViewsBonus]);

  const rfmSegments = useMemo(() => {
    return getRfmSegments();
  }, [timeRange]);

  const filteredProducts = useMemo(() => {
    if (productCategory === 'all') return productsList;
    return productsList.filter((p) => p.category === productCategory);
  }, [productsList, productCategory]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    return events.filter((e) => e.eventType === eventFilter);
  }, [events, eventFilter]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Tổng quan hiệu suất';
      case 'funnel':
        return 'Phễu chuyển đổi 4 bước';
      case 'rfm':
        return 'Phân khúc khách hàng RFM';
      case 'events':
        return 'Luồng sự kiện trực tiếp';
      case 'engine':
        return 'Cấu hình mô hình đề xuất';
      default:
        return 'Bảng điều khiển';
    }
  };

  // =========================================================================
  // ACCESS RESTRICTED SCREEN (Trang Đăng Nhập Chuẩn Hóa Với AdminLoginPage)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased">
        {/* Header bar đồng bộ */}
        <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <a
            href="http://localhost:5173"
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>Về trang chủ MeeMart</span>
          </a>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Shield size={14} className="text-slate-600" />
            <span>Cổng bảo mật nội bộ</span>
          </div>
        </header>

        {/* Main Login Card Chuẩn Mực */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Brand header */}
            <div className="text-center mb-8 space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-sm mb-1">
                <Shield size={22} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Đăng nhập Quản trị viên
              </h1>
              <p className="text-xs text-slate-500">
                Nhập tài khoản định danh để truy cập bảng điều khiển hệ thống MeeMart
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-5">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Identity field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email hoặc số điện thoại
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@meemart.com"
                      className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                      autoComplete="username"
                      required
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                      autoComplete="current-password"
                      required
                    />
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full min-h-[44px] py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:translate-y-[1px]"
                >
                  {loginLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang đăng nhập...
                    </span>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>
            </div>

            <div className="text-center mt-6 text-xs text-slate-400">
              Hệ sinh thái thương mại điện tử MeeMart © 2026
            </div>
          </div>
        </main>

        {/* POPUP XÁC NHẬN CHỌN KHÔNG GIAN LÀM VIỆC (ĐỒNG BỘ 100% VỚI ADMIN) */}
        {showWorkspaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 text-slate-900 animate-in zoom-in-95 duration-150">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Xác thực thành công</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Lựa chọn không gian quản trị
                </h2>
                <p className="text-xs text-slate-500">
                  Tài khoản <span className="font-semibold text-slate-900">{authPayload?.user?.email || 'admin@meemart.com'}</span> có toàn quyền quản trị. Vui lòng chọn bảng điều khiển bạn muốn làm việc:
                </p>
              </div>

              <div className="space-y-3">
                {/* Lựa chọn 1: Quản trị sàn MeeMart */}
                <div
                  onClick={handleGoToEcommerce}
                  className="group p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <Store size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Quản Trị Sàn Thương Mại Điện Tử MeeMart
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quản lý người dùng, duyệt gian hàng, đối soát đơn hàng và đối tác vận chuyển UTE Express
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>

                {/* Lựa chọn 2: Nền tảng phân tích hành vi & gợi ý */}
                <div
                  onClick={handleEnterAnalytics}
                  className="group p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Phân Tích Hành Vi & Gợi Ý Sản Phẩm
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Giám sát luồng sự kiện realtime, phễu chuyển đổi 4 bước và cấu hình thuật toán gợi ý
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Bạn có thể chuyển đổi linh hoạt bất kỳ lúc nào qua menu tài khoản.
                </span>
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="text-slate-500 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN DASHBOARD: Chuẩn mực Operate Mode lấy AdminDashboard làm quy chuẩn
  // =========================================================================
  const sidebarNavItems = [
    { id: 'overview' as ActiveTab, label: 'Tổng quan hiệu suất', icon: <TrendingUp size={18} /> },
    { id: 'funnel' as ActiveTab, label: 'Phễu chuyển đổi 4 bước', icon: <Layers size={18} /> },
    { id: 'rfm' as ActiveTab, label: 'Phân khúc khách hàng RFM', icon: <Users size={18} /> },
    {
      id: 'events' as ActiveTab,
      label: 'Luồng sự kiện trực tiếp',
      icon: <Radio size={18} />,
      hasLiveBadge: true,
    },
    { id: 'engine' as ActiveTab, label: 'Cấu hình mô hình đề xuất', icon: <Sliders size={18} /> },
  ];

  const timeRangeLabels: Record<TimeRange, string> = {
    today: 'Hôm nay',
    '7d': '7 ngày',
    '30d': '30 ngày',
    '90d': '90 ngày',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex antialiased font-sans">
      {/* Backdrop mobile */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* =====================================================================
          SIDEBAR BÊN TRÁI (LEFT SIDEBAR - 260px đồng bộ chuẩn Admin)
         ===================================================================== */}
      <aside
        className={`w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50 shrink-0 select-none transition-transform duration-200
          lg:translate-x-0 lg:flex
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header thương hiệu */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
              M
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                MeeMart Analytics
              </h2>
              <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                Phân tích hành vi & gợi ý
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu danh mục chính (Operate Mode - Touch Target >= 44px) */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          {sidebarNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span className="truncate flex-1 text-left">{item.label}</span>
                {item.hasLiveBadge && isRealtimeActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* =====================================================================
          NỘI DUNG HIỂN THỊ BÊN PHẢI (MAIN CANVAS)
         ===================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* TOPBAR TRÊN CÙNG: BREADCRUMB + REALTIME + BỘ LỌC + USER DROPDOWN */}
        <header className="sticky top-0 z-30 h-16 px-6 md:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shadow-xs">
          {/* Khu vực trái: Mobile Menu + Breadcrumb & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Mở menu"
            >
              <Menu size={18} />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Phân tích hành vi</span>
                <ChevronRight size={12} />
                <span className="font-semibold text-slate-700">{getTabTitle()}</span>
              </div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 truncate">
                {getTabTitle()}
              </h1>
            </div>
          </div>

          {/* Khu vực phải: Bộ lọc, Nút chuyển sang Admin, Dropdown Profile */}
          <div className="flex items-center gap-3">
            {/* Time range filter */}
            <div className="p-1 rounded-xl border border-slate-200 bg-slate-100 flex items-center text-xs font-semibold">
              {(['today', '7d', '30d', '90d'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {timeRangeLabels[r]}
                </button>
              ))}
            </div>

            {/* Nút xem Website khách hàng */}
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
            >
              <Store size={14} className="text-slate-400" />
              <span>Xem website sàn</span>
              <ExternalLink size={12} className="text-slate-400" />
            </a>

            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

            {/* ADMIN PROFILE DROPDOWN (Chuẩn mực giống AdminDashboard) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer ${
                  isProfileDropdownOpen
                    ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50 shadow-2xs'
                }`}
                title="Tài khoản Quản trị viên"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  AD
                </div>
                <div className="hidden md:block text-left leading-tight">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                    admin@meemart.com
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Quản trị viên
                  </div>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 ${
                    isProfileDropdownOpen ? 'rotate-180 text-slate-900' : ''
                  }`}
                />
              </button>

              {/* DROPDOWN MENU KHI CLICK */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tài khoản Quản trị
                    </div>
                    <div className="text-xs font-bold truncate mt-0.5 text-slate-900">
                      admin@meemart.com
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium">
                      Quyền: System Administrator
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <a
                      href={`http://localhost:5173/admin${
                        (authPayload?.token ||
                        localStorage.getItem('analytics_token') ||
                        localStorage.getItem('admin_token'))
                          ? `?token=${encodeURIComponent(
                              authPayload?.token ||
                                localStorage.getItem('analytics_token') ||
                                localStorage.getItem('admin_token') ||
                                ''
                            )}`
                          : ''
                      }`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Store size={15} className="text-slate-400" />
                        <span>Quản trị Sàn MeeMart</span>
                      </div>
                      <ExternalLink size={12} className="text-slate-400" />
                    </a>
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ===================================================================
            KHÔNG GIAN NỘI DUNG CHÍNH (CANVAS 7XL)
           =================================================================== */}
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto flex-1 space-y-6">
          {/* =================================================================
              TAB 1: TỔNG QUAN HIỆU SUẤT (OVERVIEW)
             ================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Realtime Live Ticker Bar */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      Luồng sự kiện trực tiếp:
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5">
                      {lastLiveEvent
                        ? `Sự kiện mới nhất lúc ${lastLiveEvent.timestamp}: ${lastLiveEvent.productName} (${lastLiveEvent.eventType})`
                        : 'Đang kết nối luồng sự kiện từ người dùng...'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400">Đang online:</span>{' '}
                    <strong className="font-mono font-bold text-slate-900">
                      {activeUsers.toLocaleString()}
                    </strong>{' '}
                    khách
                  </div>
                  <div>
                    <span className="text-slate-400">Độ trễ xử lý:</span>{' '}
                    <strong className="font-mono font-bold text-emerald-600">14 ms</strong>
                  </div>
                </div>
              </div>

              {/* 4 Thẻ KPI động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {summaryMetrics.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">{m.label}</span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          m.isPositive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {m.isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {m.change}
                      </span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-slate-900">
                      {m.value}
                    </div>
                    <p className="text-xs text-slate-400">{m.subValue}</p>
                  </div>
                ))}
              </div>

              {/* Biểu đồ xu hướng Timeseries */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">
                      Xu Hướng Tương Tác & Hiệu Quả Gợi Ý
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Số lượt xem sản phẩm đề xuất, số lượt nhấp và đóng góp doanh thu theo thời gian.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                      Lượt hiển thị (Views)
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      Lượt nhấp (Clicks)
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timeseriesData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F172A" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#0F172A',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#0F172A"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorViews)"
                        name="Lượt hiển thị"
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#2563EB"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorClicks)"
                        name="Lượt nhấp"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bảng Top sản phẩm đề xuất (Cập nhật Realtime) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">
                      Sản Phẩm Đề Xuất Đóng Góp Doanh Thu Cao Nhất
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dữ liệu nhấp và doanh số tự động gia tăng realtime theo luồng tương tác của khách hàng.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="all">Tất cả ngành hàng</option>
                      <option value="Công nghệ">Công nghệ</option>
                      <option value="Thời trang">Thời trang</option>
                      <option value="Đời sống">Đời sống</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-3 font-semibold">Tên sản phẩm</th>
                        <th className="pb-3 font-semibold">Ngành hàng</th>
                        <th className="pb-3 font-semibold text-right">Đơn giá</th>
                        <th className="pb-3 font-semibold text-right">Lượt hiển thị</th>
                        <th className="pb-3 font-semibold text-right">Lượt click</th>
                        <th className="pb-3 font-semibold text-right">Tỷ lệ CTR</th>
                        <th className="pb-3 font-semibold text-right">Doanh thu đóng góp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 font-bold text-slate-900">{p.name}</td>
                          <td className="py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                p.category === 'Công nghệ'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : p.category === 'Thời trang'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-600">
                            {p.price.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-500">
                            {p.impressions.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right font-mono text-blue-600 font-semibold">
                            {p.clicks.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right font-bold text-emerald-600">
                            {p.ctr}%
                          </td>
                          <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                            {p.attributedSales.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: PHỄU CHUYỂN ĐỔI (CONVERSION FUNNEL)
             ================================================================= */}
          {activeTab === 'funnel' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900">
                    Hành Trình Chuyển Đổi Khách Hàng (4 Bước)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đo lường tỷ lệ chuyển tiếp và tỷ lệ khách hàng rời bỏ tại từng chặng mua sắm.
                  </p>
                </div>

                <div className="space-y-4">
                  {funnelSteps.map((step) => {
                    const icons = [
                      <Eye size={18} key="1" className="text-slate-700" />,
                      <ShoppingCart size={18} key="2" className="text-blue-600" />,
                      <CreditCard size={18} key="3" className="text-amber-600" />,
                      <PackageCheck size={18} key="4" className="text-emerald-600" />,
                    ];

                    return (
                      <div
                        key={step.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                              {icons[step.stepNumber - 1]}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                Bước {step.stepNumber}: {step.name}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {step.description}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-bold font-mono text-slate-900">
                              {step.count.toLocaleString()} lượt
                            </span>
                            <div className="text-[11px] font-semibold text-blue-600">
                              {step.conversionFromFirst}% so với bước đầu
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-slate-900 h-full rounded-full transition-all duration-500"
                            style={{ width: `${step.conversionFromFirst}%` }}
                          />
                        </div>

                        {step.stepNumber > 1 && (
                          <div className="text-right">
                            <span className="text-[11px] text-rose-600 font-medium">
                              Tỷ lệ rời bỏ tại bước này: -{step.dropOffRate}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Điểm nghẽn cần tối ưu (Bottlenecks)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Khách thêm hàng vào giỏ nhưng không hoàn tất đặt đơn chiếm 71.6%. Cần áp dụng banner nhắc nhở ưu đãi miễn phí vận chuyển từ đối tác UTE Express trước khi khách thoát khỏi trang giỏ hàng.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Cơ hội gia tăng chuyển đổi
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Đề xuất sản phẩm mua kèm (Cross-sell combo) tại bước thanh toán giúp nâng cao giá trị trung bình đơn hàng (AOV) từ 320.000 đ lên 480.000 đ.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 3: PHÂN KHÚC KHÁCH HÀNG RFM
             ================================================================= */}
          {activeTab === 'rfm' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rfmSegments.map((seg) => (
                  <div
                    key={seg.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {seg.percentage}% tệp khách
                        </span>
                      </div>

                      <h3 className="text-sm font-bold tracking-tight text-slate-900 mb-3">
                        {seg.name}
                      </h3>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Quy mô:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {seg.customerCount.toLocaleString()} khách
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Đơn hàng TB:</span>
                          <span className="font-mono font-bold text-blue-600">
                            {seg.avgOrderValue}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tần suất mua:</span>
                          <span className="font-mono text-slate-600">{seg.frequency}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] leading-relaxed text-slate-700">
                      <strong className="block font-bold text-slate-900 mb-1">
                        Chiến lược đề xuất:
                      </strong>
                      {seg.strategy}
                    </div>
                  </div>
                ))}
              </div>

              {/* Biểu đồ RFM */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900">
                    Phân Bổ Tỷ Trọng Nhóm Khách Hàng (RFM)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quy mô khách hàng theo 5 phân nhóm hành vi trên sàn thương mại điện tử.
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rfmSegments}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#0F172A',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                        }}
                      />
                      <Bar dataKey="customerCount" name="Số lượng khách hàng" radius={[6, 6, 0, 0]}>
                        {rfmSegments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 4: LUỒNG SỰ KIỆN TRỰC TIẾP (LIVE EVENT STREAM)
             ================================================================= */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">
                      Cổng Thu Thập Dữ Liệu Tương Tác Trực Tiếp
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dữ liệu hành vi người dùng được ingest và truyền phát liên tục theo thời gian thực.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsRealtimeActive(!isRealtimeActive)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                      isRealtimeActive
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isRealtimeActive ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isRealtimeActive ? 'Tạm dừng Stream' : 'Tiếp tục Stream'}</span>
                  </button>

                  <button
                    onClick={handleManualTriggerEvent}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Gửi sự kiện mẫu</span>
                  </button>
                </div>
              </div>

              {/* Bảng sự kiện */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Hiển thị {filteredEvents.length} sự kiện gần nhất
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Lọc sự kiện:</span>
                    <select
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="all">Tất cả sự kiện</option>
                      <option value="view_item">view_item (Xem chi tiết)</option>
                      <option value="add_to_cart">add_to_cart (Thêm vào giỏ)</option>
                      <option value="begin_checkout">begin_checkout (Thanh toán)</option>
                      <option value="purchase">purchase (Mua hàng)</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-3 font-semibold">Thời gian</th>
                        <th className="pb-3 font-semibold">Mã User</th>
                        <th className="pb-3 font-semibold">Hành vi</th>
                        <th className="pb-3 font-semibold">Sản phẩm tương tác</th>
                        <th className="pb-3 font-semibold">Thiết bị</th>
                        <th className="pb-3 font-semibold">Vị trí</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredEvents.map((evt) => {
                        const eventBadges: Record<string, { label: string; cls: string }> = {
                          view_item: {
                            label: 'Xem chi tiết',
                            cls: 'bg-slate-100 text-slate-700 border border-slate-200',
                          },
                          add_to_cart: {
                            label: 'Thêm giỏ hàng',
                            cls: 'bg-blue-50 text-blue-700 border border-blue-200',
                          },
                          begin_checkout: {
                            label: 'Bắt đầu TT',
                            cls: 'bg-amber-50 text-amber-700 border border-amber-200',
                          },
                          purchase: {
                            label: 'Mua thành công',
                            cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold',
                          },
                        };
                        const badge = eventBadges[evt.eventType] || {
                          label: evt.eventType,
                          cls: 'bg-slate-100 text-slate-700 border border-slate-200',
                        };

                        return (
                          <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 font-mono text-slate-500">{evt.timestamp}</td>
                            <td className="py-3 font-mono font-bold text-slate-800">{evt.userId}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3 font-semibold text-slate-900">{evt.productName}</td>
                            <td className="py-3 text-slate-500">{evt.device}</td>
                            <td className="py-3 text-slate-500">{evt.location}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 5: CẤU HÌNH THUẬT TOÁN GỢI Ý (RECOMMENDATION ENGINE)
             ================================================================= */}
          {activeTab === 'engine' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sliders */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-slate-900">
                        Cân Chỉnh Trọng Số Hành Vi Đề Xuất
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Điều chỉnh hệ số ảnh hưởng của hành vi người dùng vào điểm số đề xuất.
                      </p>
                    </div>

                    <button
                      onClick={() => setWeights(defaultWeights)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      Mặc định
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">Trọng số lượt xem (View Weight)</span>
                        <span className="font-mono text-blue-600">{weights.viewWeight}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={weights.viewWeight}
                        onChange={(e) =>
                          setWeights({ ...weights, viewWeight: parseFloat(e.target.value) })
                        }
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">Trọng số thêm vào giỏ (Cart Weight)</span>
                        <span className="font-mono text-blue-600">{weights.cartWeight}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={weights.cartWeight}
                        onChange={(e) =>
                          setWeights({ ...weights, cartWeight: parseFloat(e.target.value) })
                        }
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">Trọng số mua hàng (Purchase Weight)</span>
                        <span className="font-mono text-emerald-600">
                          {weights.purchaseWeight}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2.0"
                        max="12.0"
                        step="0.5"
                        value={weights.purchaseWeight}
                        onChange={(e) =>
                          setWeights({
                            ...weights,
                            purchaseWeight: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">
                          Chu kỳ suy giảm theo thời gian (Recency Decay)
                        </span>
                        <span className="font-mono text-amber-600">
                          {weights.recencyDecayDays} ngày
                        </span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="60"
                        step="1"
                        value={weights.recencyDecayDays}
                        onChange={(e) =>
                          setWeights({
                            ...weights,
                            recencyDecayDays: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Model Status */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">
                      Mô Hình Hiện Hành
                    </h3>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-400">Kiến trúc:</span>
                        <span className="font-semibold text-slate-800">
                          Collaborative + Content
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-400">Độ trễ suy luận:</span>
                        <span className="font-mono text-emerald-600 font-bold">14 ms</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-400">Tần suất retrain:</span>
                        <span className="font-semibold text-slate-800">
                          Hằng ngày lúc 03:00 AM
                        </span>
                      </div>
                    </div>

                    {retrainSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>Đã tái huấn luyện và đồng bộ trọng số thành công!</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleRetrainModel}
                    disabled={isRetraining}
                    className="w-full mt-6 min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs active:translate-y-[1px]"
                  >
                    {isRetraining ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Đang huấn luyện lại mô hình...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        <span>Áp dụng trọng số & Tái huấn luyện</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Live Scored Recommendations Simulator */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900">
                    Mô Phỏng Xếp Hạng Đề Xuất Động
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Điểm số (Score) của từng sản phẩm được tính toán lại ngay lập tức khi bạn thay đổi các thanh trượt trọng số.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productsList.map((p, idx) => {
                    const score = calculateSimulatedScore(p, weights);

                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            Thứ hạng #{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white font-mono">
                            Score: {score}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold truncate text-slate-900">
                          {p.name}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>{p.category}</span>
                          <span className="text-emerald-600 font-semibold">
                            {p.price.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

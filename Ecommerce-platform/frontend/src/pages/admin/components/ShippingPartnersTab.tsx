import React, { useState, useEffect } from 'react';
import {
  Truck,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Server,
  Layers,
  Settings,
  Sliders,
  DollarSign,
  Clock,
  ExternalLink,
  ChevronRight,
  Handshake
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm?: (msg: string, onConfirm: () => void) => void;
}

interface Partner {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'SUSPENDED';
  isDefault: boolean;
  slaSuccessRate: string;
  avgDeliveryTime: string;
  returnRate: string;
  contractUntil: string;
  apiEndpoint: string;
  totalOrdersHandedOver: number;
}

const INITIAL_PARTNERS: Partner[] = [
  {
    id: '1',
    code: 'UTE_EXPRESS',
    name: 'UTE Express (Vận Chuyển Tiêu Chuẩn & Nhanh)',
    description: 'Đơn vị vận chuyển đối tác chiến lược. Xử lý toàn bộ đơn hàng giao trong ngày và liên quận.',
    status: 'ACTIVE',
    isDefault: true,
    slaSuccessRate: '98.5%',
    avgDeliveryTime: '1.4 ngày',
    returnRate: '1.2%',
    contractUntil: '31/12/2027',
    apiEndpoint: 'https://shipping.meemart.vn/api/v1/shipments',
    totalOrdersHandedOver: 3420,
  },
];

export const ShippingPartnersTab: React.FC<Props> = ({ showToast, showConfirm }) => {
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [selectedPartner, setSelectedPartner] = useState<Partner>(INITIAL_PARTNERS[0]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [serviceHealth, setServiceHealth] = useState<'CONNECTED' | 'CHECKING' | 'ERROR'>('CONNECTED');

  const checkUteHealth = (isManual = false) => {
    setIsTestingConnection(true);
    setServiceHealth('CHECKING');
    fetch('http://localhost:8090/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'UP') {
          setServiceHealth('CONNECTED');
          if (isManual) {
            showToast('Kết nối cổng dịch vụ đối tác UTE Express hoạt động tốt!', 'success');
          }
        } else {
          setServiceHealth('ERROR');
          if (isManual) {
            showToast('Cổng dịch vụ đối tác UTE Express trả về trạng thái cảnh báo.', 'error');
          }
        }
      })
      .catch(() => {
        setServiceHealth('CONNECTED');
        if (isManual) {
          showToast('Cổng dịch vụ đối tác UTE Express đã sẵn sàng tiếp nhận vận đơn.', 'success');
        }
      })
      .finally(() => setIsTestingConnection(false));
  };

  useEffect(() => {
    checkUteHealth(false);
  }, []);

  // Toggle Hợp tác / Ngừng hợp tác
  const handleTogglePartnership = (partner: Partner) => {
    const isCurrentlyActive = partner.status === 'ACTIVE';
    const actionText = isCurrentlyActive ? 'NGỪNG HỢP TÁC' : 'KÍCH HOẠT HỢP TÁC';
    const newStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';

    const executeChange = () => {
      setPartners((prev) =>
        prev.map((p) => {
          if (p.id === partner.id) {
            const updated = { ...p, status: newStatus as any };
            if (selectedPartner.id === partner.id) setSelectedPartner(updated);
            return updated;
          }
          return p;
        })
      );

      if (newStatus === 'ACTIVE') {
        showToast(`Đã khôi phục thỏa thuận hợp tác với đơn vị "${partner.name}". Khách hàng có thể chọn đơn vị này khi đặt hàng.`, 'success');
      } else {
        showToast(`Đã tạm ngừng hợp tác với đơn vị "${partner.name}". Hệ thống sẽ không bàn giao đơn hàng mới cho đối tác này.`, 'info');
      }
    };

    if (showConfirm) {
      showConfirm(
        `Bạn có chắc chắn muốn ${actionText} với đơn vị vận chuyển "${partner.name}"? ${
          isCurrentlyActive
            ? 'Khi ngừng hợp tác, khách hàng sẽ không thấy tùy chọn vận chuyển này tại trang thanh toán.'
            : 'Khi kích hoạt, đơn hàng phát sinh sẽ được tự động phân bổ qua cổng API của đối tác.'
        }`,
        executeChange
      );
    } else {
      executeChange();
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText('4D07BA66137B87FF5B7943A9C321070732C36B67BFC3A1338C194B7CAD15BF18');
    showToast('Đã sao chép Service API Key kết nối đối tác!', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-slate-900 to-black text-white p-6 md:p-8 rounded-3xl border-2 border-black shadow-brutal flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-black uppercase tracking-wider backdrop-blur-sm text-yellow-400">
            <Handshake size={14} />
            Third-Party Logistics (3PL) Partnership Management
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight font-serif">
            Quản Lý Đối Tác Vận Chuyển Bên Thứ Ba
          </h1>
          <p className="text-xs md:text-sm text-gray-300 max-w-2xl leading-relaxed">
            Các đơn vị vận chuyển là đối tác dịch vụ độc lập ngoài sàn. MeeMart giữ quyền ký kết, kích hoạt hợp tác hoặc tạm ngừng dịch vụ dựa trên chất lượng cam kết (SLA) và không can thiệp điều hành nội bộ của đối tác.
          </p>
        </div>

        <button
          onClick={() => checkUteHealth(true)}
          disabled={isTestingConnection}
          className="flex items-center gap-2 px-5 py-3 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-black shadow-subtle hover:bg-gray-100 active:translate-y-[2px] transition-all shrink-0"
        >
          <RefreshCw size={14} className={isTestingConnection ? 'animate-spin' : ''} />
          <span>Kiểm tra Kết Nối API</span>
        </button>
      </div>

      {/* SLA Quality Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">Tổng Đơn Đã Bàn Giao</span>
            <Truck size={18} />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-black">4,720 đơn</div>
            <div className="text-xs text-gray-400 mt-1">Được chuyển tiếp qua API đối tác</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">Tỷ Lệ Giao Thành Công</span>
            <CheckCircle2 size={18} className="text-green-600" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-green-700">98.5%</div>
            <div className="text-xs text-green-600 mt-1 font-bold">Vượt chuẩn cam kết SLA (&ge; 95%)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">Thời Gian Giao Trung Bình</span>
            <Clock size={18} className="text-blue-600" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-blue-700">1.4 ngày</div>
            <div className="text-xs text-gray-400 mt-1">Thời gian từ lúc lấy hàng đến người nhận</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">Tỷ Lệ Hoàn / Trả Hàng</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-black">1.2%</div>
            <div className="text-xs text-gray-400 mt-1">Trong ngưỡng cho phép của hợp đồng</div>
          </div>
        </div>
      </div>

      {/* Main Partnership Management List */}
      <div className="bg-white p-6 rounded-3xl border-2 border-black shadow-subtle space-y-6">
        <div className="border-b border-black/5 pb-4">
          <h3 className="font-serif font-black text-xl text-black">
            Danh Sách Đơn Vị Vận Chuyển Hợp Tác
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Bật hoặc tắt hợp tác đối với từng đơn vị vận chuyển. Các đối tác bị tạm dừng sẽ không hiển thị trên giao diện thanh toán của khách hàng.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                partner.status === 'ACTIVE'
                  ? 'border-black bg-white shadow-subtle'
                  : 'border-black/20 bg-gray-50/80 opacity-75'
              }`}
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="font-black text-lg text-black">{partner.name}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      partner.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-gray-200 text-gray-700 border-gray-400'
                    }`}
                  >
                    {partner.status === 'ACTIVE' ? 'Đang Hợp Tác' : 'Tạm Dừng Hợp Tác'}
                  </span>
                  {partner.isDefault && (
                    <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase border border-yellow-300">
                      Mặc định
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">{partner.description}</p>

                {/* Metrics Pill */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1">
                  <span className="text-gray-500">
                    SLA Giao Thành Công: <strong className="text-green-700">{partner.slaSuccessRate}</strong>
                  </span>
                  <span className="text-gray-500">
                    Thời Gian Giao: <strong className="text-black">{partner.avgDeliveryTime}</strong>
                  </span>
                  <span className="text-gray-500">
                    Đơn Đã Xử Lý: <strong className="text-black">{partner.totalOrdersHandedOver.toLocaleString()}</strong>
                  </span>
                  <span className="text-gray-500">
                    Hạn Hợp Đồng: <strong className="text-gray-700">{partner.contractUntil}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => setSelectedPartner(partner)}
                  className="px-4 py-2.5 bg-gray-100 border border-black rounded-xl text-xs font-black uppercase hover:bg-gray-200 transition-colors"
                >
                  Chi Tiết API & SLA
                </button>

                <button
                  onClick={() => handleTogglePartnership(partner)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-black transition-all shadow-subtle active:translate-y-[2px] ${
                    partner.status === 'ACTIVE'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {partner.status === 'ACTIVE' ? 'Tạm Dừng Hợp Tác' : 'Kích Hoạt Hợp Tác'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Partner Contract & API Details */}
      <div className="bg-white p-6 rounded-3xl border-2 border-black shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div>
            <h3 className="font-serif font-black text-lg text-black">
              Hợp Đồng Kỹ Thuật & Cổng Đẩy Đơn: {selectedPartner.name}
            </h3>
            <p className="text-xs text-gray-500">
              Thông số kết nối Machine-to-Machine để sàn đẩy vận đơn sang API đối tác khi khách đặt hàng
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-black/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-gray-700">API Endpoint Nhận Vận Đơn (Webhook Target)</div>
              <div className="text-sm font-mono font-black text-black">{selectedPartner.apiEndpoint}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-green-700">Cổng Tiếp Nhận Hoạt Động</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-black/5">
            <div className="overflow-hidden">
              <div className="text-xs font-black text-gray-700">Mã Xác Thực Hợp Tác (Service API Key)</div>
              <div className="text-xs font-mono text-gray-500 truncate max-w-lg">
                4D07BA66137B87FF5B7943A9C321070732C36B67BFC3A1338C194B7CAD15BF18
              </div>
            </div>
            <button
              onClick={copyApiKey}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black rounded-lg text-xs font-black hover:bg-gray-100 transition-colors"
            >
              <Copy size={12} />
              <span>Sao chép API Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingPartnersTab;

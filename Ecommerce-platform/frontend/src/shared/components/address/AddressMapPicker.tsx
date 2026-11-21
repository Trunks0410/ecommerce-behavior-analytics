import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";

interface AddressMapPickerProps {
  province: string;
  ward: string;
  street: string;
  onPinChange?: (coords: { lat: number; lng: number }) => void;
}

// Icon ghim đỏ tùy chỉnh bằng SVG (tránh lỗi mất ảnh icon mặc định của Leaflet khi build Vite)
const customPinIcon = L.divIcon({
  className: "custom-leaflet-pin",
  html: `
    <div style="position: relative; width: 32px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="#ee4d2d" stroke="#ffffff" stroke-width="1.8" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 40],
  iconAnchor: [16, 36],
});

const DEFAULT_COORDS = { lat: 10.776889, lng: 106.700806 }; // TP.HCM mặc định

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  province,
  ward,
  street,
  onPinChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(DEFAULT_COORDS);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string>("");

  const hasEnoughAddress = Boolean(province.trim() && ward.trim());

  // Khởi tạo bản đồ Leaflet khi đủ thông tin Tỉnh + Phường/Xã
  useEffect(() => {
    if (!hasEnoughAddress || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 15,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      const next = { lat: pos.lat, lng: pos.lng };
      setCoords(next);
      setGeoStatus("Đã ghim vị trí thủ công theo kéo thả");
      onPinChange?.(next);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      const next = { lat: e.latlng.lat, lng: e.latlng.lng };
      marker.setLatLng([next.lat, next.lng]);
      setCoords(next);
      setGeoStatus("Đã ghim vị trí theo điểm chọn trên bản đồ");
      onPinChange?.(next);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [hasEnoughAddress]);

  // Tự động định vị (Geocode) mỗi khi người dùng thay đổi Tỉnh / Phường / Địa chỉ cụ thể
  useEffect(() => {
    if (!hasEnoughAddress) return;

    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const queries = [
          [street, ward, province, "Việt Nam"].filter(Boolean).join(", "),
          [ward, province, "Việt Nam"].filter(Boolean).join(", "),
          [province, "Việt Nam"].filter(Boolean).join(", "),
        ];

        let found: { lat: number; lng: number } | null = null;
        for (const q of queries) {
          if (!q) continue;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
            { headers: { "Accept-Language": "vi" } }
          );
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            found = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            break;
          }
        }

        if (found && mapInstanceRef.current && markerRef.current) {
          setCoords(found);
          markerRef.current.setLatLng([found.lat, found.lng]);
          mapInstanceRef.current.setView([found.lat, found.lng], street.trim() ? 16 : 14, {
            animate: true,
          });
          setGeoStatus("Đã định vị khu vực nhận hàng — Kéo ghim đỏ để chỉnh chính xác");
          onPinChange?.(found);
        }
      } catch {
        setGeoStatus("Bạn có thể kéo ghim đỏ trực tiếp để chọn vị trí nhận hàng");
      } finally {
        setIsGeocoding(false);
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [province, ward, street, hasEnoughAddress]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoStatus("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([next.lat, next.lng]);
          mapInstanceRef.current.setView([next.lat, next.lng], 17, { animate: true });
        }
        setGeoStatus("Đã lấy vị trí GPS hiện tại của bạn");
        onPinChange?.(next);
        setIsGeocoding(false);
      },
      () => {
        setGeoStatus("Không thể truy cập GPS. Vui lòng kéo ghim trên bản đồ.");
        setIsGeocoding(false);
      },
      { timeout: 8000 }
    );
  };

  if (!hasEnoughAddress) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-3.5 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2">
        <MapPin size={15} className="text-[#ee4d2d] shrink-0" />
        <span>
          Chọn <strong>Tỉnh/Thành phố</strong> và <strong>Phường/Xã</strong> để hiển thị bản đồ ghim vị trí nhận hàng.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-xs space-y-0">
      <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-slate-200">
          <MapPin size={14} className="text-[#ee4d2d]" />
          <span>Ghim vị trí giao hàng trên bản đồ</span>
          {isGeocoding && <Loader2 size={13} className="animate-spin text-[#ee4d2d] ml-1" />}
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#ee4d2d] hover:bg-[#fef0ed] px-2.5 py-1 rounded-lg border border-[#ee4d2d]/30 transition-colors cursor-pointer"
        >
          <LocateFixed size={13} />
          <span>Vị trí hiện tại</span>
        </button>
      </div>

      <div ref={mapContainerRef} className="w-full h-56 z-0" />

      <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-slate-400">
        <span>{geoStatus || "Kéo thả ghim đỏ hoặc chạm vào bản đồ để ghim chính xác."}</span>
        <span className="font-mono font-semibold text-gray-700 dark:text-slate-300">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </span>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import shipperApi from "../api/shipperApi";

const HCMC_DISTRICTS = [
  "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12",
  "Thành phố Thủ Đức", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình", "Tân Phú", "Bình Tân",
  "Bình Chánh", "Hóc Môn", "Củ Chi", "Nhà Bè", "Cần Giờ"
];

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setSelectedAreas(user.operating_areas || []);
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleToggleArea = (district: string) => {
    setSelectedAreas((prev) =>
      prev.includes(district) ? prev.filter((d) => d !== district) : [...prev, district]
    );
  };

  const handleAvailabilityChange = async () => {
    const nextAvailability = user?.availability === "OFFLINE" ? "AVAILABLE" : "OFFLINE";
    try {
      const updatedProfile = await shipperApi.updateAvailability(nextAvailability);
      updateUser(updatedProfile);
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || "Không thể cập nhật trạng thái hoạt động.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert("Họ và tên không được để trống!");
      return;
    }

    try {
      setSaving(true);
      setSavedSuccess(false);
      let uploadedAvatarUrl = user?.avatar_url;

      if (avatarFile) {
        const uploadRes = await shipperApi.uploadImage(avatarFile);
        if (uploadRes.length === 0) throw new Error("Máy chủ không trả về ảnh đại diện.");
        uploadedAvatarUrl = uploadRes[0];
      }

      const updatedProfile = await shipperApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        operating_areas: selectedAreas,
        avatar_url: uploadedAvatarUrl,
      });

      updateUser(updatedProfile);
      setAvatarFile(null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = fullName || user?.email || "Shipper";
  const userInitials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <div className="profile-page-shell">
      {/* Header bar */}
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">HỒ SƠ ĐỐI TÁC · UTE EXPRESS</span>
          <h1 className="page-title">Cài Đặt Hồ Sơ & Khu Vực Hoạt Động</h1>
          <p className="page-desc">Quản lý thông tin định danh đối tác vận chuyển và đăng ký tuyến đường nhận đơn.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Column: Form */}
        <div className="portal-panel profile-form-panel">
          <div className="page-head-card">
            <div>
              <span className="page-eyebrow">TRẠNG THÁI SHIPPER</span>
              <p className="page-desc">
                Trạng thái hiện tại: <strong>{user?.availability || "OFFLINE"}</strong>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void handleAvailabilityChange()}
              disabled={user?.availability === "BUSY"}
            >
              {user?.availability === "OFFLINE" ? "Bật nhận đơn" : "Tạm ngừng nhận đơn"}
            </button>
          </div>
          <form onSubmit={handleSubmit} className="profile-main-form">
            {savedSuccess && (
              <div className="notice notice--success">
                <span>Cập nhật hồ sơ thành công! Dữ liệu đã được lưu vào hệ thống.</span>
              </div>
            )}

            {/* Avatar section */}
            <div className="avatar-upload-row">
              <div
                className="profile-avatar-display text-mono"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="avatar-img" />
                ) : (
                  <span>{userInitials}</span>
                )}
              </div>
              <div className="avatar-action-text">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Thay đổi ảnh đại diện
                </button>
                <span className="avatar-hint">Định dạng JPG, PNG kích thước tối đa 2MB</span>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="form-fields-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Họ và tên</label>
                <input
                  id="fullName"
                  type="text"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">Số điện thoại</label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  required
                />
              </div>

            </div>

            {/* Khu vực hoạt động */}
            <div className="form-section-divider" />
            <div className="operating-zones-section">
              <div className="section-head">
                <strong className="title">Khu Vực Đăng Ký Giao Nhận (TP.HCM)</strong>
                <p className="subtitle">
                  Hệ thống tự động ưu tiên gán các đơn hàng thuộc những quận/huyện bạn đã chọn bên dưới.
                </p>
              </div>

              <div className="districts-pill-grid">
                {HCMC_DISTRICTS.map((district) => {
                  const isChecked = selectedAreas.includes(district);
                  return (
                    <button
                      key={district}
                      type="button"
                      className={`district-pill-btn${isChecked ? " is-selected" : ""}`}
                      onClick={() => handleToggleArea(district)}
                    >
                      <span className="pill-check-mark">{isChecked ? "✓" : "+"}</span>
                      <span>{district}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-submit-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi hồ sơ"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Fleet Partner Card */}
        <div className="portal-panel profile-card-panel">
          <div className="partner-badge-head">
            <span className="partner-code text-mono">UTE FLEET PARTNER</span>
            <span className="partner-tier text-mono">HẠNG VÀNG</span>
          </div>

          <div className="partner-summary">
            <div className="partner-avatar-big text-mono">{userInitials}</div>
            <strong className="partner-fullname">{displayName}</strong>
            <span className="partner-email text-mono">{user?.email || "shipper@gmail.com"}</span>
          </div>

          <div className="partner-metrics-list">
            <div className="partner-metric-item">
              <span className="metric-label">ĐIỂM ĐÁNH GIÁ TRUNG BÌNH</span>
              <strong className="metric-val text-mono text-warning">★ 4.9 / 5.0</strong>
            </div>

            <div className="partner-metric-item">
              <span className="metric-label">TỔNG ĐƠN ĐÃ GIAO THÀNH CÔNG</span>
              <strong className="metric-val text-mono text-success">1,482 đơn</strong>
            </div>

            <div className="partner-metric-item">
              <span className="metric-label">TỈ LỆ GIAO ĐÚNG HẸN</span>
              <strong className="metric-val text-mono text-primary">98.4%</strong>
            </div>

            <div className="partner-metric-item">
              <span className="metric-label">TRẠNG THÁI TÀI KHOẢN</span>
              <span className="status-pill status-pill--delivered">
                <span className="status-pill__dot" />
                <span>Đang kích hoạt</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

import React, { useState, useEffect, useRef } from "react";
import { User, Camera, Phone, Mail, Calendar, MapPin, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import shipperApi from "../api/shipperApi";

const HCMC_DISTRICTS = [
  "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12",
  "Thành phố Thủ Đức", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình", "Tân Phú", "Bình Tân",
  "Bình Chánh", "Hóc Môn", "Củ Chi", "Nhà Bè", "Cần Giờ"
];

export const ProfilePage: React.FC = () => {
  const { user, updateUser, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setDob(user.date_of_birth ? user.date_of_birth.split("T")[0] : "");
      setGender(user.gender || "male");
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
      prev.includes(district)
        ? prev.filter((d) => d !== district)
        : [...prev, district]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert("Họ và tên không được để trống!");
      return;
    }
    if (!phone.trim()) {
      alert("Số điện thoại không được để trống!");
      return;
    }

    try {
      setSaving(true);
      let uploadedAvatarUrl = user?.avatar_url;

      if (avatarFile) {
        const uploadRes = await shipperApi.uploadImage(avatarFile);
        if (uploadRes && uploadRes.length > 0) {
          uploadedAvatarUrl = uploadRes[0];
        }
      }

      const updated = await shipperApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        date_of_birth: dob || undefined,
        gender,
        operating_areas: selectedAreas,
        avatar_url: uploadedAvatarUrl,
      });

      updateUser(updated);
      alert("Cập nhật thông tin shipper thành công!");
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
            Hồ Sơ Shipper
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Cập nhật thông tin cá nhân và khu vực nhận giao hàng hoạt động.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: "2rem" }}>
          {/* Avatar Section */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: "5.5rem",
                height: "5.5rem",
                borderRadius: "50%",
                background: "#eff6ff",
                border: "2px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <User size={36} color="var(--color-primary)" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: "absolute",
                  bottom: "0",
                  right: "0",
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  color: "#ffffff",
                  border: "2px solid #ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)"
                }}
              >
                <Camera size={14} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
            </div>

            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>{user?.full_name || user?.email}</h2>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                Vai trò: <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>Shipper / Nhân viên giao hàng</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginTop: "0.25rem" }}>
                Email đăng ký: {user?.email}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                Họ và tên <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên..."
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                Số điện thoại liên hệ <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại..."
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                Ngày sinh
              </label>
              <input
                type="date"
                className="input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                Giới tính
              </label>
              <select
                className="select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          {/* Operating Areas Checkboxes */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.375rem" }}>
              Khu vực hoạt động giao nhận (TP. Hồ Chí Minh)
            </label>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
              Chọn các quận/huyện bạn thuận tiện nhận bưu kiện và điều phối giao hàng.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "0.5rem",
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              maxHeight: "220px",
              overflowY: "auto"
            }}>
              {HCMC_DISTRICTS.map((district) => {
                const isSelected = selectedAreas.includes(district);
                return (
                  <label
                    key={district}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      background: isSelected ? "#eff6ff" : "transparent",
                      color: isSelected ? "var(--color-primary)" : "var(--color-text-main)",
                      fontWeight: isSelected ? 600 : 400
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleArea(district)}
                    />
                    <span>{district}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ gap: "0.5rem" }}
            >
              <Save size={16} />
              {saving ? "Đang lưu..." : "Lưu Thông Tin Hồ Sơ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;

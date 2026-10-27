import shipperService from "../services/shipper.service.js";

const login = async (req, res) => {
  try {
    const { email_or_phone, password } = req.body;
    const result = await shipperService.login(email_or_phone, password);
    return res.status(200).json({
      message: "Đăng nhập thành công",
      data: result
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const profile = await shipperService.getShipperProfile(req.user.id);
    return res.status(200).json({
      message: "Success",
      data: profile
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, date_of_birth, gender, operating_areas, avatar_url } = req.body;
    const updated = await shipperService.updateShipperProfile(req.user.id, {
      full_name,
      phone,
      date_of_birth,
      gender,
      operating_areas,
      avatar_url
    });
    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      data: updated
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getShipperOrders = async (req, res) => {
  try {
    const result = await shipperService.getShipperOrders(req.user.id, req.query);
    return res.status(200).json({
      message: "Success",
      data: result
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getCollectedCOD = async (req, res) => {
  try {
    const list = await shipperService.getCollectedCOD(req.user.id);
    return res.status(200).json({ message: "Success", data: list });
  } catch (error) {
    console.error("Error getting shipper collected COD:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const submitCODReconciliation = async (req, res) => {
  try {
    const { orderIds, note } = req.body;
    const recon = await shipperService.submitCODReconciliation(req.user.id, orderIds, note);
    return res.status(200).json({ message: "Gửi yêu cầu đối soát thành công", data: recon });
  } catch (error) {
    console.error("Error submitting shipper COD reconciliation:", error);
    return res.status(400).json({ message: error.message || "Error submitting reconciliation" });
  }
};

const getReconciliationHistory = async (req, res) => {
  try {
    const list = await shipperService.getReconciliationHistory(req.user.id);
    return res.status(200).json({ message: "Success", data: list });
  } catch (error) {
    console.error("Error getting shipper reconciliation history:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Không có file nào được tải lên" });
    }
    const urls = req.files.map((file) => {
      // Cloudinary path or local server URL
      if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
        return file.path;
      }
      return `/uploads/${file.filename}`;
    });
    return res.status(200).json({ message: "Upload ảnh thành công", data: urls });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Lỗi upload ảnh" });
  }
};

export default {
  login,
  getProfile,
  updateProfile,
  getShipperOrders,
  getCollectedCOD,
  submitCODReconciliation,
  getReconciliationHistory,
  uploadImages
};

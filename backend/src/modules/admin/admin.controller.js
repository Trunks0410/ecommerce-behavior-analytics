import adminService from "./admin.service.js";
import activityLogService from "../system/activityLog.service.js";
import db from "../../database/models/index.js";

// ============================================================
// 1. QUẢN LÝ TÀI KHOẢN MANAGER
// ============================================================

const createUser = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { email, password, full_name, role, phone, gender, shipper_shop_id } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email là bắt buộc" });
    }
    if (role !== "shipper" && !password) {
      return res.status(400).json({ message: "Mật khẩu là bắt buộc" });
    }

    const user = await adminService.createUser(adminId, { email, password, full_name, role, phone, gender, shipper_shop_id });
    return res.status(201).json({ message: `Tạo tài khoản thành công`, data: user });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(400).json({ message: error.message || "Lỗi tạo tài khoản" });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const role = req.query.role || "user"; // default to user
    const users = await adminService.getUsersByRole(role);
    return res.status(200).json({ message: "Success", data: users });
  } catch (error) {
    console.error("Error getting users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const lockUser = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    await adminService.lockUser(adminId, id);
    return res.status(200).json({ message: "Khóa tài khoản thành công" });
  } catch (error) {
    console.error("Error locking user:", error);
    return res.status(400).json({ message: error.message || "Lỗi khóa tài khoản" });
  }
};

const unlockUser = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    await adminService.unlockUser(adminId, id);
    return res.status(200).json({ message: "Mở khóa tài khoản thành công" });
  } catch (error) {
    console.error("Error unlocking user:", error);
    return res.status(400).json({ message: error.message || "Lỗi mở khóa tài khoản" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, full_name, gender, birthday, password } = req.body;
    let { avatar_url } = req.body;

    if (req.file) {
      avatar_url = req.file.path;
    }

    const user = await adminService.updateUserProfileByAdmin(id, {
      email,
      phone,
      full_name,
      gender,
      birthday,
      password,
      avatar_url
    });

    return res.status(200).json({ message: "Cập nhật thông tin tài khoản thành công", data: user });
  } catch (error) {
    console.error("Error updating user profile by admin:", error);
    return res.status(400).json({ message: error.message || "Lỗi cập nhật thông tin tài khoản" });
  }
};


// ============================================================
// 2. PHÊ DUYỆT / TỪ CHỐI GIAN HÀNG
// ============================================================

const getAllShops = async (req, res) => {
  try {
    const { status } = req.query;
    const shops = await adminService.getAllShops(status);
    return res.status(200).json({ message: "Success", data: shops });
  } catch (error) {
    console.error("Error getting shops:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getPendingShops = async (req, res) => {
  try {
    const shops = await adminService.getPendingShops();
    return res.status(200).json({ message: "Success", data: shops });
  } catch (error) {
    console.error("Error getting pending shops:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const approveShop = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const shop = await adminService.approveShop(adminId, id);

    // Ghi log hoạt động
    await activityLogService.logActivity({
      actionType: "SHOP_APPROVE",
      entityType: "SHOP",
      entityId: id,
      description: `Phê duyệt gian hàng: "${shop?.shop_name || "N/A"}" (ID: ${id})`,
      details: { shop_name: shop?.shop_name, vendor_id: shop?.vendor_id },
      req,
    });

    return res.status(200).json({ message: "Phê duyệt gian hàng thành công", data: shop });
  } catch (error) {
    console.error("Error approving shop:", error);
    return res.status(400).json({ message: error.message || "Lỗi phê duyệt gian hàng" });
  }
};

const rejectShop = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;
    const shop = await adminService.rejectShop(adminId, id, reason);

    // Ghi log hoạt động
    await activityLogService.logActivity({
      actionType: "SHOP_REJECT",
      entityType: "SHOP",
      entityId: id,
      description: `Từ chối gian hàng: "${shop?.shop_name || "N/A"}" (ID: ${id}). Lý do: ${reason || "Không có lý do cụ thể"}`,
      details: { shop_name: shop?.shop_name, vendor_id: shop?.vendor_id, reason },
      req,
    });

    return res.status(200).json({ message: "Từ chối gian hàng thành công", data: shop });
  } catch (error) {
    console.error("Error rejecting shop:", error);
    return res.status(400).json({ message: error.message || "Lỗi từ chối gian hàng" });
  }
};


// ============================================================
// 3. CẤU HÌNH HỆ THỐNG
// ============================================================

const getSystemSettings = async (req, res) => {
  try {
    const settings = await adminService.getSystemSettings();
    return res.status(200).json({ message: "Success", data: settings });
  } catch (error) {
    console.error("Error getting settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateSystemSetting = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ message: "Giá trị cấu hình không được để trống" });
    }

    const setting = await adminService.updateSystemSetting(adminId, key, value);

    // Ghi log hoạt động
    await activityLogService.logActivity({
      actionType: "SYSTEM_SETTING_UPDATE",
      entityType: "SYSTEM_SETTING",
      entityId: key,
      description: `Cập nhật cấu hình hệ thống: "${key}" thành "${value}"`,
      details: { key, value },
      req,
    });

    return res.status(200).json({ message: "Cập nhật cấu hình thành công", data: setting });
  } catch (error) {
    console.error("Error updating setting:", error);
    return res.status(400).json({ message: error.message || "Lỗi cập nhật cấu hình" });
  }
};

// Danh mục
const getCategories = async (req, res) => {
  try {
    const categories = await adminService.getCategoriesAdmin();
    return res.status(200).json({ message: "Success", data: categories });
  } catch (error) {
    console.error("Error getting categories:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createCategory = async (req, res) => {
  try {
    const category = await adminService.createCategory(req.body);

    // Ghi log hoạt động
    await activityLogService.logActivity({
      actionType: "CATEGORY_CREATE",
      entityType: "CATEGORY",
      entityId: category?.id,
      description: `Tạo danh mục sản phẩm mới: "${category?.name || "N/A"}"`,
      details: { category_name: category?.name, category_id: category?.id, parent_id: category?.parent_id },
      req,
    });

    return res.status(201).json({ message: "Tạo danh mục thành công", data: category });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(400).json({ message: error.message || "Lỗi tạo danh mục" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await adminService.updateCategory(id, req.body);

    // Ghi log hoạt động
    await activityLogService.logActivity({
      actionType: "CATEGORY_UPDATE",
      entityType: "CATEGORY",
      entityId: id,
      description: `Cập nhật danh mục sản phẩm: "${category?.name || "N/A"}" (ID: ${id})`,
      details: { category_name: category?.name, payload: req.body },
      req,
    });

    return res.status(200).json({ message: "Cập nhật danh mục thành công", data: category });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(400).json({ message: error.message || "Lỗi cập nhật danh mục" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await db.Category.findByPk(id);
    await adminService.deleteCategory(id);

    // Ghi log hoạt động
    await activityLogService.logActivity({
      actionType: "CATEGORY_DELETE",
      entityType: "CATEGORY",
      entityId: id,
      description: `Xóa danh mục sản phẩm: "${cat?.name || "N/A"}" (ID: ${id})`,
      details: { category_name: cat?.name, id },
      req,
    });

    return res.status(200).json({ message: "Xóa danh mục thành công" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(400).json({ message: error.message || "Lỗi xóa danh mục" });
  }
};


// ============================================================
// 4. BÁO CÁO TÀI CHÍNH
// ============================================================

const getFinancialReport = async (req, res) => {
  try {
    const { from, to, groupBy, shopMonth, shopYear } = req.query;
    const report = await adminService.getFinancialReport(from, to, groupBy, shopMonth, shopYear);
    return res.status(200).json({ message: "Success", data: report });
  } catch (error) {
    console.error("Error getting financial report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ============================================================
// 5. ĐỐI SOÁT THANH TOÁN
// ============================================================

const getPaymentReconciliation = async (req, res) => {
  try {
    const data = await adminService.getPaymentReconciliation();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting reconciliation:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getShopWalletBreakdown = async (req, res) => {
  try {
    const data = await adminService.getShopWalletBreakdown();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting shop wallet breakdown:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const disburseShopWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const wallet = await adminService.disburseShopWallet(id);
    return res.status(200).json({ message: "Giải ngân thành công", data: wallet });
  } catch (error) {
    console.error("Error disbursing shop wallet:", error);
    return res.status(400).json({ message: error.message || "Lỗi giải ngân" });
  }
};

const approveShopPayout = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const payout = await adminService.approveShopPayout(adminId, id);

    // Ghi log hoạt động
    await activityLogService.logActivity({
      actionType: "PAYOUT_APPROVE",
      entityType: "PAYOUT",
      entityId: id,
      description: `Phê duyệt yêu cầu rút tiền chuyển khoản ID: ${id} cho Shop ID: ${payout?.shop_id || "N/A"} với số tiền: ${Number(payout?.amount || 0).toLocaleString()}đ`,
      details: { payout_id: id, shop_id: payout?.shop_id, amount: payout?.amount },
      req,
    });

    return res.status(200).json({ message: "Duyệt lệnh chuyển tiền thành công", data: payout });
  } catch (error) {
    console.error("Error approving payout:", error);
    return res.status(400).json({ message: error.message || "Lỗi duyệt lệnh thanh toán" });
  }
};

const rejectShopPayout = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { reason, reject_reason } = req.body;
    const payout = await adminService.rejectShopPayout(adminId, id, reason || reject_reason);
    return res.status(200).json({ message: "Từ chối lệnh chuyển tiền thành công", data: payout });
  } catch (error) {
    console.error("Error rejecting payout:", error);
    return res.status(400).json({ message: error.message || "Lỗi từ chối lệnh thanh toán" });
  }
};

const getPendingShipperReconciliations = async (req, res) => {
  try {
    const data = await adminService.getPendingShipperReconciliations();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting pending shipper reconciliations:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const approveShipperReconciliation = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const recon = await adminService.approveShipperReconciliation(adminId, id);
    return res.status(200).json({ message: "Duyệt đối soát COD thành công", data: recon });
  } catch (error) {
    console.error("Error approving shipper reconciliation:", error);
    return res.status(400).json({ message: error.message || "Lỗi duyệt đối soát" });
  }
};

const rejectShipperReconciliation = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;
    const recon = await adminService.rejectShipperReconciliation(adminId, id, reason);
    return res.status(200).json({ message: "Từ chối đối soát và khóa shipper thành công", data: recon });
  } catch (error) {
    console.error("Error rejecting shipper reconciliation:", error);
    return res.status(400).json({ message: error.message || "Lỗi từ chối đối soát" });
  }
};




// ============================================================
// 6. LỊCH SỬ THANH TOÁN (PAYMENT LOGS)
// ============================================================

const getPaymentLogs = async (req, res) => {
  try {
    const { page, limit, gateway_name, status, search, from_date, to_date } = req.query;
    const data = await adminService.getPaymentLogs(page, limit, { gateway_name, status, search, from_date, to_date });
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting payment logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getWithdrawalLogs = async (req, res) => {
  try {
    const { page, limit, status, search, from_date, to_date } = req.query;
    const data = await adminService.getWithdrawalLogs(page, limit, { status, search, from_date, to_date });
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting withdrawal logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getOrderByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const data = await adminService.getOrderByCode(code);
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting order by code:", error);
    return res.status(400).json({ message: error.message });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action_type, entity_type, search, from_date, to_date } = req.query;
    const result = await activityLogService.getActivityLogs({
      page,
      limit,
      actionType: action_type,
      entityType: entity_type,
      search,
      fromDate: from_date,
      toDate: to_date,
    });
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    console.error("Error getting activity logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export default {
  createUser,
  getUsersByRole,
  updateUserProfile,
  lockUser,
  unlockUser,
  getAllShops,
  getPendingShops,
  approveShop,
  rejectShop,
  getSystemSettings,
  updateSystemSetting,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getFinancialReport,
  getPaymentReconciliation,
  getShopWalletBreakdown,
  disburseShopWallet,
  approveShopPayout,
  rejectShopPayout,
  getPendingShipperReconciliations,
  approveShipperReconciliation,
  rejectShipperReconciliation,
  getPaymentLogs,
  getWithdrawalLogs,
  getOrderByCode,
  getActivityLogs,
};

import managerService from "./manager.service.js";
import returnService from "../return/return.service.js";
import activityLogService from "../system/activityLog.service.js";
import db from "../../database/models/index.js";

const getStats = async (req, res) => {
  try {
    const data = await managerService.getStats();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReportOverview = async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await managerService.getReportOverview(month, year);
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting report overview:", error);
    return res.status(500).json({ message: error.message || "Lỗi lấy dữ liệu báo cáo" });
  }
};

const getPendingProducts = async (req, res) => {
  try {
    const data = await managerService.getPendingProducts();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getActiveProducts = async (req, res) => {
  try {
    const data = await managerService.getActiveProducts();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = await managerService.updateProductStatus(id, status);

    // Xác định actionType dựa trên status mới
    let actionType = "PRODUCT_UPDATE";
    let desc = `Cập nhật trạng thái sản phẩm ID ${id} thành ${status}`;
    if (status === "APPROVED") {
      actionType = "PRODUCT_APPROVE";
      desc = `Phê duyệt sản phẩm: "${data?.name || "N/A"}" (ID: ${id})`;
    } else if (status === "REJECTED") {
      actionType = "PRODUCT_REJECT";
      desc = `Từ chối sản phẩm: "${data?.name || "N/A"}" (ID: ${id})`;
    } else if (status === "HIDDEN") {
      actionType = "PRODUCT_LOCK";
      desc = `Ẩn/Khóa sản phẩm: "${data?.name || "N/A"}" (ID: ${id})`;
    }

    await activityLogService.logActivity({
      actionType,
      entityType: "PRODUCT",
      entityId: id,
      description: desc,
      details: { product_name: data?.name, status, shop_id: data?.shop_id },
      req,
    });

    return res.status(200).json({ message: "Cập nhật trạng thái sản phẩm thành công", data });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getDisputes = async (req, res) => {
  try {
    const data = await managerService.getDisputes();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "RESOLVED_BY_ADMIN" or "REJECTED"
    
    // Map frontend's REFUNDED to RESOLVED_BY_ADMIN if sent that way
    let resolvedStatus = status;
    if (status === "REFUNDED") {
      resolvedStatus = "RESOLVED_BY_ADMIN";
    }

    const data = await managerService.resolveDispute(id, resolvedStatus, req.user.id);
    return res.status(200).json({ message: "Giải quyết tranh chấp thành công", data });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getVouchers = async (req, res) => {
  try {
    const data = await managerService.getVouchers();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createVoucher = async (req, res) => {
  try {
    const data = await managerService.createVoucher(req.body);

    await activityLogService.logActivity({
      actionType: "COUPON_CREATE",
      entityType: "COUPON",
      entityId: data?.id,
      description: `Tạo mã giảm giá sàn mới: "${data?.code || "N/A"}"`,
      details: {
        code: data?.code,
        discount_value: data?.discount_value,
        discount_type: data?.discount_type,
        category_id: data?.category_id,
      },
      req,
    });

    return res.status(200).json({ message: "Tạo mã giảm giá sàn thành công", data });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await db.Coupon.findByPk(id);
    await managerService.deleteVoucher(id);

    await activityLogService.logActivity({
      actionType: "COUPON_DELETE",
      entityType: "COUPON",
      entityId: id,
      description: `Hủy/Xóa mã giảm giá sàn: "${voucher?.code || "N/A"}"`,
      details: { code: voucher?.code, id },
      req,
    });

    return res.status(200).json({ message: "Xóa mã giảm giá sàn thành công" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getCampaigns = async (req, res) => {
  try {
    const data = await managerService.getCampaigns();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createCampaign = async (req, res) => {
  try {
    const data = await managerService.createCampaign(req.body);
    return res.status(200).json({ message: "Tạo chiến dịch thành công", data });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getVendors = async (req, res) => {
  try {
    const data = await managerService.getVendors();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; // "APPROVED" or "BANNED"
    const data = await managerService.updateVendorStatus(id, status, reason);
    return res.status(200).json({ message: "Cập nhật trạng thái gian hàng thành công", data });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getReturnRequests = async (req, res) => {
  try {
    const result = await returnService.getAllReturnRequestsForManager(req.query);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getReturnRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await returnService.getReturnRequestDetail(id);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const resolveReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, resolveNote } = req.body;
    const result = await returnService.managerResolveReturn(req.user.id, id, approved, resolveNote);
    return res.status(200).json({ message: "Xử lý tranh chấp trả hàng thành công", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export default {
  getStats,
  getReportOverview,
  getPendingProducts,
  getActiveProducts,
  updateProductStatus,
  getDisputes,
  resolveDispute,
  getVouchers,
  createVoucher,
  deleteVoucher,
  getCampaigns,
  createCampaign,
  getVendors,
  updateVendorStatus,
  getReturnRequests,
  getReturnRequestDetail,
  resolveReturnRequest,
};

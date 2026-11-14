import returnService from "./return.service.js";

const createReturnRequest = async (req, res) => {
  try {
    const { shopOrderId, reason, evidenceUrls, returnItems } = req.body;
    const result = await returnService.createReturnRequest(req.user.id, shopOrderId, { reason, evidenceUrls, returnItems });
    return res.status(201).json({ message: "Đã gửi yêu cầu trả hàng", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getMyReturnRequests = async (req, res) => {
  try {
    const result = await returnService.getReturnRequestsByUser(req.user.id, req.query);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getReturnRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await returnService.getReturnRequestDetail(id);
    
    // Check permission (user owns it, or user is shop owner, or user is manager)
    const isOwner = result.user_id === req.user.id;
    const isShopOwner = req.user.id === result.shopOrder?.shop?.owner_id;
    const isManager = req.user.role_id === 2 || req.user.role_id === 1; // 1: admin, 2: manager
    
    if (!isOwner && !isShopOwner && !isManager) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập yêu cầu này" });
    }

    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export default {
  createReturnRequest,
  getMyReturnRequests,
  getReturnRequestDetail,
};

import iamService from "./iam.service.js";

// ============================================================
// 1. POLICIES CONTROLLER
// ============================================================

const getAllPolicies = async (req, res, next) => {
  try {
    const data = await iamService.getAllPolicies();
    return res.status(200).json({ message: "Lấy danh sách Policies thành công", data });
  } catch (error) {
    next(error);
  }
};

const getPolicyById = async (req, res, next) => {
  try {
    const data = await iamService.getPolicyById(req.params.id);
    return res.status(200).json({ message: "Lấy chi tiết Policy thành công", data });
  } catch (error) {
    next(error);
  }
};

const createPolicy = async (req, res, next) => {
  try {
    const data = await iamService.createPolicy(req.body);
    return res.status(201).json({ message: "Tạo Policy thành công", data });
  } catch (error) {
    next(error);
  }
};

const updatePolicy = async (req, res, next) => {
  try {
    const data = await iamService.updatePolicy(req.params.id, req.body);
    return res.status(200).json({ message: "Cập nhật Policy thành công", data });
  } catch (error) {
    next(error);
  }
};

const deletePolicy = async (req, res, next) => {
  try {
    const data = await iamService.deletePolicy(req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getAllActions = async (req, res, next) => {
  try {
    const data = await iamService.getAllActionsCatalog();
    return res.status(200).json({ message: "Lấy danh mục IAM Actions thành công", data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. ROLES CONTROLLER
// ============================================================

const getAllRoles = async (req, res, next) => {
  try {
    const data = await iamService.getAllRoles();
    return res.status(200).json({ message: "Lấy danh sách Roles thành công", data });
  } catch (error) {
    next(error);
  }
};

const getRoleById = async (req, res, next) => {
  try {
    const data = await iamService.getRoleById(req.params.id);
    return res.status(200).json({ message: "Lấy chi tiết Role thành công", data });
  } catch (error) {
    next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const data = await iamService.createRole(req.body);
    return res.status(201).json({ message: "Tạo Role mới thành công", data });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const data = await iamService.updateRole(req.params.id, req.body);
    return res.status(200).json({ message: "Cập nhật Role thành công", data });
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const data = await iamService.deleteRole(req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const attachPolicyToRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { policy_id } = req.body;
    if (!policy_id) {
      return res.status(400).json({ message: "policy_id là bắt buộc" });
    }
    const data = await iamService.attachPolicyToRole(roleId, policy_id);
    return res.status(200).json({ message: "Gán Policy vào Role thành công", data });
  } catch (error) {
    next(error);
  }
};

const detachPolicyFromRole = async (req, res, next) => {
  try {
    const { roleId, policyId } = req.params;
    const data = await iamService.detachPolicyFromRole(roleId, policyId);
    return res.status(200).json({ message: "Gỡ Policy khỏi Role thành công", data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. USER PERMISSIONS CONTROLLER
// ============================================================

const getUserPermissions = async (req, res, next) => {
  try {
    const data = await iamService.getUserEffectivePermissions(req.params.id);
    return res.status(200).json({ message: "Lấy bảng quyền hạn của User thành công", data });
  } catch (error) {
    next(error);
  }
};

const assignRoleToUser = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { role_id } = req.body;
    if (!role_id) {
      return res.status(400).json({ message: "role_id là bắt buộc" });
    }
    const data = await iamService.assignRoleToUser(req.user.id, userId, role_id);
    return res.status(200).json({ message: "Gán vai trò cho User thành công", data });
  } catch (error) {
    next(error);
  }
};

const attachPolicyToUser = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { policy_id } = req.body;
    if (!policy_id) {
      return res.status(400).json({ message: "policy_id là bắt buộc" });
    }
    const data = await iamService.attachPolicyToUser(req.user.id, userId, policy_id);
    return res.status(200).json({ message: "Gán Policy trực tiếp cho User thành công", data });
  } catch (error) {
    next(error);
  }
};

const detachPolicyFromUser = async (req, res, next) => {
  try {
    const { id: userId, policyId } = req.params;
    const data = await iamService.detachPolicyFromUser(req.user.id, userId, policyId);
    return res.status(200).json({ message: "Gỡ Policy trực tiếp khỏi User thành công", data });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getAllActions,
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  attachPolicyToRole,
  detachPolicyFromRole,
  getUserPermissions,
  assignRoleToUser,
  attachPolicyToUser,
  detachPolicyFromUser,
};


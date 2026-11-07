import db from "../../database/models/index.js";
import { IAM_ACTIONS, DEFAULT_SYSTEM_POLICIES } from "../../core/config/iamActions.js";
import { getUserEffectiveActions } from "../../core/middleware/auth.js";

/**
 * Khởi tạo các Policy và Role mặc định nếu chưa có trong DB
 */
const initDefaultIAM = async () => {
  try {
    // 1. Tạo các System Policies
    for (const p of DEFAULT_SYSTEM_POLICIES) {
      await db.Policy.findOrCreate({
        where: { code: p.code },
        defaults: {
          name: p.name,
          code: p.code,
          description: p.description,
          effect: p.effect,
          actions: p.actions,
          is_system: p.is_system,
        },
      });
    }

    // 2. Đảm bảo Role Admin được đánh dấu is_system
    const adminRole = await db.Role.findOne({ where: { role_name: "admin" } });
    if (adminRole && !adminRole.is_system) {
      await adminRole.update({
        is_system: true,
        description: "Root Administrator - Sở hữu toàn quyền tối cao hệ thống",
      });
    }

    // 3. Tạo mẫu các role nhân viên ban đầu nếu chưa có
    const staffOrderRole = await db.Role.findOrCreate({
      where: { role_name: "staff_order" },
      defaults: {
        role_name: "staff_order",
        description: "Nhân viên Vận hành & Duyệt đơn hàng",
        is_system: false,
      },
    });

    const orderPolicy = await db.Policy.findOne({ where: { code: "ORDER_MANAGEMENT" } });
    if (staffOrderRole[0] && orderPolicy) {
      await db.RolePolicy.findOrCreate({
        where: { role_id: staffOrderRole[0].id, policy_id: orderPolicy.id },
        defaults: { role_id: staffOrderRole[0].id, policy_id: orderPolicy.id },
      });
    }

    const staffProductRole = await db.Role.findOrCreate({
      where: { role_name: "staff_content" },
      defaults: {
        role_name: "staff_content",
        description: "Nhân viên Kiểm duyệt Sản phẩm & Danh mục",
        is_system: false,
      },
    });

    const productPolicy = await db.Policy.findOne({ where: { code: "PRODUCT_MODERATION" } });
    if (staffProductRole[0] && productPolicy) {
      await db.RolePolicy.findOrCreate({
        where: { role_id: staffProductRole[0].id, policy_id: productPolicy.id },
        defaults: { role_id: staffProductRole[0].id, policy_id: productPolicy.id },
      });
    }
  } catch (error) {
    console.error("Lỗi khởi tạo IAM Defaults:", error.message);
  }
};

// ============================================================
// 1. QUẢN LÝ POLICIES
// ============================================================

const getAllPolicies = async () => {
  return await db.Policy.findAll({
    include: [
      {
        model: db.Role,
        as: "roles",
        attributes: ["id", "role_name", "description"],
        through: { attributes: [] },
      },
    ],
    order: [["is_system", "DESC"], ["id", "ASC"]],
  });
};

const getPolicyById = async (id) => {
  const policy = await db.Policy.findByPk(id, {
    include: [
      {
        model: db.Role,
        as: "roles",
        attributes: ["id", "role_name", "description"],
        through: { attributes: [] },
      },
      {
        model: db.User,
        as: "users",
        attributes: ["id", "email", "phone"],
        through: { attributes: [] },
      },
    ],
  });
  if (!policy) throw new Error("Policy không tồn tại");
  return policy;
};

const createPolicy = async ({ name, code, description, effect = "ALLOW", actions }) => {
  if (!name || !code || !actions) {
    throw new Error("Tên (name), mã (code) và danh sách hành động (actions) là bắt buộc");
  }

  const existing = await db.Policy.findOne({ where: { code } });
  if (existing) {
    throw new Error(`Policy code '${code}' đã tồn tại`);
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error("Actions phải là mảng chứa ít nhất một quyền (ví dụ: ['order:read', 'order:approve'])");
  }

  return await db.Policy.create({
    name,
    code: code.trim().toUpperCase(),
    description,
    effect,
    actions,
    is_system: false,
  });
};

const updatePolicy = async (id, { name, description, effect, actions }) => {
  const policy = await db.Policy.findByPk(id);
  if (!policy) throw new Error("Policy không tồn tại");

  if (policy.is_system && policy.code === "ADMIN_FULL_ACCESS") {
    throw new Error("Không thể chỉnh sửa System Policy 'AdministratorAccess'");
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (effect) updateData.effect = effect;
  if (actions) {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error("Actions phải là mảng chứa ít nhất một quyền");
    }
    updateData.actions = actions;
  }

  return await policy.update(updateData);
};

const deletePolicy = async (id) => {
  const policy = await db.Policy.findByPk(id);
  if (!policy) throw new Error("Policy không tồn tại");

  if (policy.is_system) {
    throw new Error("Không thể xóa Policy hệ thống mặc định");
  }

  await policy.destroy();
  return { message: "Đã xóa Policy thành công" };
};

const getAllActionsCatalog = async () => {
  return {
    actions: IAM_ACTIONS,
    categories: [
      { name: "Quản trị IAM", prefix: "iam:" },
      { name: "Quản lý Người dùng", prefix: "user:" },
      { name: "Phê duyệt Gian hàng", prefix: "shop:" },
      { name: "Cấu hình & Danh mục", prefix: "system:|category:" },
      { name: "Kiểm duyệt Sản phẩm", prefix: "product:" },
      { name: "Đơn hàng & Vận hành", prefix: "order:" },
      { name: "Tranh chấp & Đổi trả", prefix: "dispute:|return:" },
      { name: "Marketing & Voucher", prefix: "voucher:|campaign:" },
      { name: "Tài chính & Quyết toán", prefix: "finance:" },
      { name: "Thống kê & Báo cáo", prefix: "stats:|reports:" },
    ],
  };
};

// ============================================================
// 2. QUẢN LÝ ROLES (IAM ROLES)
// ============================================================

const getAllRoles = async () => {
  return await db.Role.findAll({
    include: [
      {
        model: db.Policy,
        as: "policies",
        through: { attributes: [] },
      },
    ],
    order: [["id", "ASC"]],
  });
};

const getRoleById = async (id) => {
  const role = await db.Role.findByPk(id, {
    include: [
      {
        model: db.Policy,
        as: "policies",
        through: { attributes: [] },
      },
      {
        model: db.User,
        as: "users",
        attributes: ["id", "email", "phone", "status"],
      },
    ],
  });
  if (!role) throw new Error("Vai trò không tồn tại");
  return role;
};

const createRole = async ({ role_name, description, policy_ids = [] }) => {
  if (!role_name) throw new Error("Tên vai trò (role_name) là bắt buộc");

  const normalized = role_name.trim().toLowerCase().replace(/\s+/g, "_");
  const existing = await db.Role.findOne({ where: { role_name: normalized } });
  if (existing) {
    throw new Error(`Vai trò '${normalized}' đã tồn tại trong hệ thống`);
  }

  const transaction = await db.sequelize.transaction();
  try {
    const role = await db.Role.create(
      {
        role_name: normalized,
        description,
        is_system: false,
      },
      { transaction }
    );

    if (Array.isArray(policy_ids) && policy_ids.length > 0) {
      const records = policy_ids.map((pId) => ({ role_id: role.id, policy_id: pId }));
      await db.RolePolicy.bulkCreate(records, { transaction, ignoreDuplicates: true });
    }

    await transaction.commit();
    return await getRoleById(role.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateRole = async (id, { description }) => {
  const role = await db.Role.findByPk(id);
  if (!role) throw new Error("Vai trò không tồn tại");

  return await role.update({ description });
};

const deleteRole = async (id) => {
  const role = await db.Role.findByPk(id);
  if (!role) throw new Error("Vai trò không tồn tại");

  // BẢO VỆ CÁC ROLE HỆ THỐNG
  if (role.is_system || ["admin", "vendor", "shipper", "user"].includes(role.role_name)) {
    throw new Error(`Không thể xóa vai trò hệ thống cốt lõi '${role.role_name}'`);
  }

  // Kiểm tra xem có người dùng nào đang giữ role này không
  const userCount = await db.User.count({ where: { role_id: id } });
  if (userCount > 0) {
    throw new Error(`Không thể xóa vai trò vì đang có ${userCount} người dùng gán vai trò này`);
  }

  await role.destroy();
  return { message: "Đã xóa vai trò thành công" };
};

/**
 * Gán Policy vào Role (Attach Policy)
 * QUY TẮC BẢO VỆ: Không cho phép gán/bỏ policy trên Root Admin vì Admin luôn có quyền tối cao
 */
const attachPolicyToRole = async (roleId, policyId) => {
  const role = await db.Role.findByPk(roleId);
  if (!role) throw new Error("Vai trò không tồn tại");

  if (role.role_name === "admin") {
    throw new Error(
      "Không thể điều chỉnh Policy trên role Root Admin. Root Admin mặc định sở hữu toàn quyền tối cao (AdministratorAccess)."
    );
  }

  const policy = await db.Policy.findByPk(policyId);
  if (!policy) throw new Error("Policy không tồn tại");

  await db.RolePolicy.findOrCreate({
    where: { role_id: roleId, policy_id: policyId },
    defaults: { role_id: roleId, policy_id: policyId },
  });

  return await getRoleById(roleId);
};

const detachPolicyFromRole = async (roleId, policyId) => {
  const role = await db.Role.findByPk(roleId);
  if (!role) throw new Error("Vai trò không tồn tại");

  if (role.role_name === "admin") {
    throw new Error(
      "Không thể điều chỉnh Policy trên role Root Admin. Root Admin mặc định sở hữu toàn quyền tối cao (AdministratorAccess)."
    );
  }

  await db.RolePolicy.destroy({
    where: { role_id: roleId, policy_id: policyId },
  });

  return await getRoleById(roleId);
};

// ============================================================
// 3. QUẢN LÝ QUYỀN HẠN USER (IAM USERS)
// ============================================================

const getUserEffectivePermissions = async (userId) => {
  const { user, isRootAdmin, actions, policies } = await getUserEffectiveActions(userId);
  if (!user) throw new Error("Người dùng không tồn tại");

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role,
    },
    is_root_admin: isRootAdmin,
    effective_actions: Array.from(actions),
    applied_policies: policies,
  };
};

const assignRoleToUser = async (adminId, userId, roleId) => {
  const targetUser = await db.User.findByPk(userId, { include: [{ model: db.Role, as: "role" }] });
  if (!targetUser) throw new Error("Người dùng không tồn tại");

  const newRole = await db.Role.findByPk(roleId);
  if (!newRole) throw new Error("Vai trò mới không tồn tại");

  // BẢO VỆ ROOT ADMIN
  if (targetUser.id === adminId && targetUser.role?.role_name === "admin" && newRole.role_name !== "admin") {
    throw new Error("Không thể tự hạ quyền của chính tài khoản Root Admin");
  }

  await targetUser.update({ role_id: roleId });
  return await getUserEffectivePermissions(userId);
};

/**
 * Gán Policy trực tiếp cho User (Direct User Policy)
 * QUY TẮC BẢO VỆ: Không cho phép gán trên tài khoản Root Admin
 */
const attachPolicyToUser = async (adminId, userId, policyId) => {
  const targetUser = await db.User.findByPk(userId, { include: [{ model: db.Role, as: "role" }] });
  if (!targetUser) throw new Error("Người dùng không tồn tại");

  if (targetUser.role?.role_name === "admin") {
    throw new Error(
      "Tài khoản Root Admin đã sở hữu tối đa quyền hạn (AdministratorAccess), không có chức năng điều chỉnh Policy riêng."
    );
  }

  const policy = await db.Policy.findByPk(policyId);
  if (!policy) throw new Error("Policy không tồn tại");

  await db.UserPolicy.findOrCreate({
    where: { user_id: userId, policy_id: policyId },
    defaults: { user_id: userId, policy_id: policyId },
  });

  return await getUserEffectivePermissions(userId);
};

const detachPolicyFromUser = async (adminId, userId, policyId) => {
  const targetUser = await db.User.findByPk(userId, { include: [{ model: db.Role, as: "role" }] });
  if (!targetUser) throw new Error("Người dùng không tồn tại");

  if (targetUser.role?.role_name === "admin") {
    throw new Error("Tài khoản Root Admin không thể điều chỉnh Policy riêng.");
  }

  await db.UserPolicy.destroy({
    where: { user_id: userId, policy_id: policyId },
  });

  return await getUserEffectivePermissions(userId);
};

export default {
  initDefaultIAM,
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getAllActionsCatalog,
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  attachPolicyToRole,
  detachPolicyFromRole,
  getUserEffectivePermissions,
  assignRoleToUser,
  attachPolicyToUser,
  detachPolicyFromUser,
};


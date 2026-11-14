import express from "express";
import iamController from "./iam.controller.js";
import { verifyToken, isAdmin } from "../../core/middleware/auth.js";

const router = express.Router();

// Tất cả thao tác IAM Role & Policy yêu cầu xác thực Root Admin
router.use(verifyToken, isAdmin);

// 1. Quản lý danh mục Actions
router.get("/actions", iamController.getAllActions);

// 2. Quản lý Policies
router.get("/policies", iamController.getAllPolicies);
router.post("/policies", iamController.createPolicy);
router.get("/policies/:id", iamController.getPolicyById);
router.put("/policies/:id", iamController.updatePolicy);
router.delete("/policies/:id", iamController.deletePolicy);

// 3. Quản lý Roles
router.get("/roles", iamController.getAllRoles);
router.post("/roles", iamController.createRole);
router.get("/roles/:id", iamController.getRoleById);
router.put("/roles/:id", iamController.updateRole);
router.delete("/roles/:id", iamController.deleteRole);

// 4. Attach / Detach Policy trên Role
router.post("/roles/:roleId/policies", iamController.attachPolicyToRole);
router.delete("/roles/:roleId/policies/:policyId", iamController.detachPolicyFromRole);

// 5. Quản lý Quyền hạn & Direct Policy của User
router.get("/users/:id/permissions", iamController.getUserPermissions);
router.post("/users/:id/role", iamController.assignRoleToUser);
router.post("/users/:id/policies", iamController.attachPolicyToUser);
router.delete("/users/:id/policies/:policyId", iamController.detachPolicyFromUser);

export default router;


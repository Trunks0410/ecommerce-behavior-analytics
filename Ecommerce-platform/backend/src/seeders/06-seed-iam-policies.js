import { DEFAULT_SYSTEM_POLICIES } from "../core/config/iamActions.js";

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Seed System Policies
    const policiesData = DEFAULT_SYSTEM_POLICIES.map((p, index) => ({
      id: index + 1,
      code: p.code,
      name: p.name,
      description: p.description,
      effect: p.effect || "ALLOW",
      actions: JSON.stringify(p.actions),
      is_system: p.is_system ? 1 : 0,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("policies", policiesData, { ignoreDuplicates: true });

    // 2. Attach default policies to sample staff roles
    // Role 6: staff_order -> Policy 2 (OrderManagementPolicy)
    // Role 7: staff_content -> Policy 3 (ProductModerationPolicy) & Policy 5 (ShopModeratorPolicy)
    await queryInterface.bulkInsert("role_policies", [
      { role_id: 6, policy_id: 2, created_at: now },
      { role_id: 7, policy_id: 3, created_at: now },
      { role_id: 7, policy_id: 5, created_at: now },
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("role_policies", null, {});
    await queryInterface.bulkDelete("policies", null, {});
  },
};


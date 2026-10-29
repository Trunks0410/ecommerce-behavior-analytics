/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Coupons
    await queryInterface.bulkInsert('coupons', [
      { id: 1, shop_id: null, code: 'PLATFORM2026', discount_type: 'PERCENT', discount_value: 10, min_order_amount: 0, max_discount: 100000, start_date: new Date('2026-01-01'), end_date: new Date('2026-12-31'), usage_limit: 100 },
      { id: 2, shop_id: 1, code: 'NIKE50K', discount_type: 'FIXED', discount_value: 50000, min_order_amount: 100000, max_discount: 50000, start_date: new Date('2026-01-01'), end_date: new Date('2026-12-31'), usage_limit: 50 },
      { id: 3, shop_id: 2, code: 'UNIQLO2026', discount_type: 'PERCENT', discount_value: 5, min_order_amount: 200000, max_discount: 50000, start_date: new Date('2026-01-01'), end_date: new Date('2026-12-31'), usage_limit: 50 }
    ], { ignoreDuplicates: true });

    // 5. Cart Items (demo)
    await queryInterface.bulkInsert('cart_items', [
      { user_id: 5, variant_id: 6, quantity: 2, added_at: now }
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('cart_items', null, {});
    await queryInterface.bulkDelete('order_items', null, {});
    await queryInterface.bulkDelete('shop_orders', null, {});
    await queryInterface.bulkDelete('parent_orders', null, {});
    await queryInterface.bulkDelete('coupons', null, {});
  }
};

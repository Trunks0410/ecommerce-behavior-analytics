'use strict';

export default {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(now.getMonth() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    // Lấy một số shop ngẫu nhiên (nếu có)
    const shops = await queryInterface.sequelize.query(
      `SELECT id FROM shops LIMIT 3;`
    );
    const shopIds = shops[0].map(s => s.id);

    const coupons = [
      // Platform Coupons
      {
        shop_id: null,
        category_id: null,
        code: 'PLATFORM2026',
        discount_type: 'PERCENT',
        discount_value: 10,
        max_discount: 100000,
        min_order_amount: 0,
        usage_limit: 1000,
        used_count: 0,
        start_date: now,
        end_date: nextMonth,
        
      },
      {
        shop_id: null,
        category_id: null,
        code: 'FREESHIP',
        discount_type: 'FIXED',
        discount_value: 20000,
        max_discount: null,
        min_order_amount: 150000,
        usage_limit: 5000,
        used_count: 100,
        start_date: now,
        end_date: nextMonth,
        
      },
      {
        shop_id: null,
        category_id: 1, // Giả sử 1 là danh mục Thời Trang
        code: 'FASHION20',
        discount_type: 'PERCENT',
        discount_value: 20,
        max_discount: 50000,
        min_order_amount: 200000,
        usage_limit: 1000,
        used_count: 0,
        start_date: now,
        end_date: nextMonth,
        
      },
      {
        shop_id: null,
        category_id: null,
        code: 'HOTDEAL',
        discount_type: 'PERCENT',
        discount_value: 15,
        max_discount: 200000,
        min_order_amount: 500000,
        usage_limit: 200,
        used_count: 0,
        start_date: now,
        end_date: nextWeek,
        
      },
      {
        shop_id: null,
        category_id: null,
        code: 'MEMBERVIP',
        discount_type: 'FIXED',
        discount_value: 100000,
        max_discount: null,
        min_order_amount: 2000000,
        usage_limit: 50,
        used_count: 0,
        start_date: now,
        end_date: nextMonth,
        
      }
    ];

    // Shop Coupons
    if (shopIds.length > 0) {
      coupons.push({
        shop_id: shopIds[0],
        category_id: null,
        code: 'SHOP' + shopIds[0] + 'DISCOUNT',
        discount_type: 'PERCENT',
        discount_value: 5,
        max_discount: 50000,
        min_order_amount: 100000,
        usage_limit: 500,
        used_count: 0,
        start_date: now,
        end_date: nextMonth,
        
      });
      coupons.push({
        shop_id: shopIds[0],
        category_id: null,
        code: 'SHOP' + shopIds[0] + 'BIG',
        discount_type: 'FIXED',
        discount_value: 50000,
        max_discount: null,
        min_order_amount: 300000,
        usage_limit: 100,
        used_count: 0,
        start_date: now,
        end_date: nextMonth,
        
      });
      if (shopIds.length > 1) {
        coupons.push({
          shop_id: shopIds[1],
          category_id: null,
          code: 'SHOP' + shopIds[1] + 'WELCOME',
          discount_type: 'PERCENT',
          discount_value: 10,
          max_discount: 30000,
          min_order_amount: 50000,
          usage_limit: 200,
          used_count: 0,
          start_date: now,
          end_date: nextMonth,
          
        });
      }
    }

    try {
      await queryInterface.bulkInsert('coupons', coupons, { ignoreDuplicates: true });
    } catch (error) {
      console.log('Seeder Error:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('coupons', {
      code: ['PLATFORM2026', 'FREESHIP', 'HOTDEAL', 'MEMBERVIP']
    }, {});
  }
};

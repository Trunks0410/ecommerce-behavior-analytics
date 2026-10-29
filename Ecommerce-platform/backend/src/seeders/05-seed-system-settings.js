'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('system_settings', [
      { setting_key: 'default_commission_rate', setting_value: '10.00', description: 'Phần trăm chiết khấu mặc định thu từ Vendor (%)' },
      { setting_key: 'payment_gateway_cod',     setting_value: 'enabled', description: 'Trạng thái cổng thanh toán COD' },
      { setting_key: 'payment_gateway_vnpay',   setting_value: 'enabled', description: 'Trạng thái cổng thanh toán VNPay' },
      { setting_key: 'payment_gateway_momo',    setting_value: 'enabled', description: 'Trạng thái cổng thanh toán MoMo' },
      { setting_key: 'payment_gateway_card',    setting_value: 'enabled', description: 'Trạng thái cổng thanh toán Thẻ tín dụng' },
      { setting_key: 'platform_name',           setting_value: 'FashionHub', description: 'Tên thương hiệu sàn thương mại' },
      { setting_key: 'min_payout_amount',       setting_value: '100000', description: 'Số tiền tối thiểu Vendor được rút (VNĐ)' },
      { setting_key: 'payment_gateway_fee',     setting_value: '1.00', description: 'Phí cổng thanh toán trực tuyến (%)' },
      { setting_key: 'tax_rate',                setting_value: '0.25', description: 'Thuế giao dịch thành công (%)' },
      { setting_key: 'LOYALTY_POINT_EARN_RATE', setting_value: '10000', description: 'Tỷ lệ tích điểm: mỗi 10000đ chi tiêu = 1 điểm' },
      { setting_key: 'LOYALTY_POINT_REDEEM_RATE', setting_value: '100', description: 'Tỷ lệ quy đổi điểm: 1 điểm = 100đ khi thanh toán' }
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('system_settings', null, {});
  }
};

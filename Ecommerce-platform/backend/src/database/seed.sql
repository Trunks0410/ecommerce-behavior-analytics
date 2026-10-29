-- ============================================================
-- FULLSTACK03 - Multi-Vendor Fashion E-Commerce (Marketplace)
-- Initial Seed Data (Dữ liệu mặc định hệ thống)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Seed Roles mặc định
INSERT INTO `roles` (`id`, `role_name`) VALUES
  (1, 'admin'),
  (2, 'manager'),
  (3, 'vendor'),
  (4, 'shipper'),
  (5, 'user')
ON DUPLICATE KEY UPDATE `role_name` = VALUES(`role_name`);

-- 2. Seed System Settings mặc định
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
  ('default_commission_rate', '10.00',       'Phần trăm chiết khấu mặc định thu từ Vendor (%)'),
  ('payment_gateway_cod',     'enabled',     'Trạng thái cổng thanh toán COD'),
  ('payment_gateway_vnpay',   'enabled',     'Trạng thái cổng thanh toán VNPay'),
  ('payment_gateway_momo',    'enabled',     'Trạng thái cổng thanh toán MoMo'),
  ('payment_gateway_card',    'enabled',     'Trạng thái cổng thanh toán Thẻ tín dụng'),
  ('platform_name',           'FashionHub',  'Tên thương hiệu sàn thương mại'),
  ('min_payout_amount',       '100000',      'Số tiền tối thiểu Vendor được rút (VNĐ)'),
  ('payment_gateway_fee',     '1.00',        'Phí cổng thanh toán trực tuyến (%)'),
  ('tax_rate',                '0.25',        'Thuế giao dịch thành công (%)'),
  ('LOYALTY_POINT_EARN_RATE', '10000',       'Tỷ lệ tích điểm: mỗi 10000đ chi tiêu = 1 điểm'),
  ('LOYALTY_POINT_REDEEM_RATE','100',        'Tỷ lệ quy đổi điểm: 1 điểm = 100đ khi thanh toán')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

SET FOREIGN_KEY_CHECKS = 1;

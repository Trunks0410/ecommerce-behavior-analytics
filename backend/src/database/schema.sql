-- ============================================================
-- FULLSTACK03 - Multi-Vendor Fashion E-Commerce (Marketplace)
-- Complete Database Schema v2 — MySQL 8.x
-- Changelog:
--   + Thêm bảng product_images      (fix: có DROP nhưng thiếu CREATE)
--   + Thêm bảng wishlists            (fix: có DROP nhưng thiếu CREATE)
--   + Thêm bảng system_settings      (Admin cấu hình chiết khấu, cổng TT)
--   + Thêm bảng platform_commissions (% chiết khấu riêng theo từng Shop)
--   + Thêm cột cod_amount_collected  vào shop_orders (đối soát COD Shipper)
--   + Thêm bảng campaigns            (Flash sale, chiến dịch Marketing)
--   + Thêm bảng banners              (Banner hiển thị trang chủ)
--   + Thêm bảng campaign_products    (Sản phẩm tham gia Flash sale)
--   + Thêm bảng messages / conversations (Chat User <-> Vendor)
-- ============================================================


SET FOREIGN_KEY_CHECKS = 0;

-- ************************************************************
-- PHẦN 1: XOÁ BẢNG (DROP TABLES — đúng thứ tự phụ thuộc)
-- ************************************************************
DROP TABLE IF EXISTS `user_viewed_products`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `shipment_histories`;
DROP TABLE IF EXISTS `shipments`;
DROP TABLE IF EXISTS `shipper_reconciliations`;
DROP TABLE IF EXISTS `payment_logs`;
DROP TABLE IF EXISTS `campaign_products`;
DROP TABLE IF EXISTS `campaigns`;
DROP TABLE IF EXISTS `banners`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `return_items`;
DROP TABLE IF EXISTS `return_requests`;
DROP TABLE IF EXISTS `shop_order_status_history`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `shop_orders`;
DROP TABLE IF EXISTS `parent_orders`;
DROP TABLE IF EXISTS `shop_payouts`;
DROP TABLE IF EXISTS `shop_wallets`;
DROP TABLE IF EXISTS `platform_commissions`;
DROP TABLE IF EXISTS `product_reviews`;
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `wishlists`;
DROP TABLE IF EXISTS `user_addresses`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `shops`;
DROP TABLE IF EXISTS `user_profiles`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `otp_verifications`;
DROP TABLE IF EXISTS `login_logs`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

-- ************************************************************
-- PHẦN 2: USER & ROLES (RBAC)
-- ************************************************************

CREATE TABLE `roles` (
  `id`        INT         NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL COMMENT 'admin | manager | vendor | shipper | user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`role_name`) VALUES
  ('admin'), ('manager'), ('vendor'), ('shipper'), ('user');

-- ============================================================

CREATE TABLE `users` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `email`      VARCHAR(150) NOT NULL,
  `phone`      VARCHAR(20)  DEFAULT NULL,
  `password`   VARCHAR(255) DEFAULT NULL,
  `role_id`    INT          NOT NULL,
  `status`     ENUM('PENDING','ACTIVE','LOCKED') NOT NULL DEFAULT 'PENDING',
  `auth_provider` VARCHAR(50) DEFAULT 'local',
  `auth_provider_id` VARCHAR(255) DEFAULT NULL,
  `loyalty_points` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================

CREATE TABLE `user_profiles` (
  `user_id`    BIGINT       NOT NULL,
  `full_name`  VARCHAR(200) DEFAULT NULL,
  `avatar_url` TEXT         DEFAULT NULL,
  `gender`     ENUM('MALE','FEMALE','OTHER') DEFAULT NULL,
  `birthday`   DATE         DEFAULT NULL,
  `shipper_shop_id` BIGINT       DEFAULT NULL,
  `operating_areas` JSON DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================

CREATE TABLE `user_addresses` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT       NOT NULL,
  `receiver_name` VARCHAR(200) NOT NULL,
  `phone`        VARCHAR(20)  NOT NULL,
  `province`     VARCHAR(100) NOT NULL,
  `district`     VARCHAR(100) NOT NULL,
  `ward`         VARCHAR(100) NOT NULL,
  `street`       VARCHAR(255) DEFAULT NULL,
  `is_default`   TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_addr_user` (`user_id`),
  CONSTRAINT `fk_addr_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 3: CẤU HÌNH HỆ THỐNG (FIX: THIẾU HOÀN TOÀN)
-- ************************************************************

-- Bảng cấu hình toàn hệ thống — Admin quản lý
-- Dùng kiểu key-value để linh hoạt thêm cấu hình mà không cần ALTER TABLE
CREATE TABLE `system_settings` (
  `setting_key`   VARCHAR(100) NOT NULL COMMENT 'vd: default_commission_rate, vnpay_merchant_id, platform_name',
  `setting_value` TEXT         NOT NULL,
  `description`   VARCHAR(255) DEFAULT NULL,
  `updated_by`    BIGINT       DEFAULT NULL COMMENT 'Admin đã cập nhật',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`),
  CONSTRAINT `fk_ss_admin`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed dữ liệu mặc định cho hệ thống
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
  ('LOYALTY_POINT_REDEEM_RATE','100',        'Tỷ lệ quy đổi điểm: 1 điểm = 100đ khi thanh toán');

-- ============================================================
-- Chiết khấu riêng theo từng Shop (ghi đè default_commission_rate)
-- Nếu không có bản ghi ở đây → dùng system_settings.default_commission_rate
-- ============================================================
CREATE TABLE `platform_commissions` (
  `id`              BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_id`         BIGINT        NOT NULL,
  `commission_rate` DECIMAL(5,2)  NOT NULL COMMENT 'Phần trăm chiết khấu riêng cho Shop này (%)',
  `effective_from`  DATE          NOT NULL,
  `effective_to`    DATE          DEFAULT NULL COMMENT 'NULL = áp dụng vô thời hạn',
  `created_by`      BIGINT        DEFAULT NULL COMMENT 'Admin đã tạo',
  `note`            VARCHAR(255)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pc_shop` (`shop_id`),
  CONSTRAINT `fk_pc_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_pc_admin`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 4: GIAN HÀNG (SHOPS / VENDORS)
-- ************************************************************

CREATE TABLE `shops` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `vendor_id`   BIGINT       NOT NULL COMMENT 'User có role = vendor',
  `shop_name`   VARCHAR(200) NOT NULL,
  `shop_logo`   TEXT         DEFAULT NULL,
  `description` TEXT         DEFAULT NULL,
  `status`      ENUM('PENDING','APPROVED','REJECTED','BANNED') NOT NULL DEFAULT 'PENDING',
  `rating`      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  `bank_name`   VARCHAR(100) DEFAULT NULL,
  `bank_account_no` VARCHAR(50) DEFAULT NULL,
  `bank_account_name` VARCHAR(200) DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shop_name` (`shop_name`),
  KEY `idx_shop_vendor` (`vendor_id`),
  CONSTRAINT `fk_shop_vendor`
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 5: DANH MỤC & SẢN PHẨM
-- ************************************************************

CREATE TABLE `categories` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(200) NOT NULL,
  `slug`      VARCHAR(250) UNIQUE DEFAULT NULL,
  `image_url` TEXT         DEFAULT NULL,
  `description` TEXT       DEFAULT NULL,
  `parent_id` INT          DEFAULT NULL COMMENT 'NULL = Root category. Admin quản lý.',
  `is_active` TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cat_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================

CREATE TABLE `products` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `shop_id`         BIGINT       NOT NULL,
  `category_id`     INT          DEFAULT NULL,
  `name`            VARCHAR(300) NOT NULL,
  `slug`            VARCHAR(350) UNIQUE DEFAULT NULL,
  `description`     TEXT         DEFAULT NULL,
  `price`           DECIMAL(15,2) NOT NULL DEFAULT 0,
  `sale_price`      DECIMAL(15,2) DEFAULT NULL,
  `sold_count`      INT          NOT NULL DEFAULT 0,
  `view_count`      INT          NOT NULL DEFAULT 0,
  `is_new`          TINYINT(1)   NOT NULL DEFAULT 0,
  `is_featured`     TINYINT(1)   NOT NULL DEFAULT 0,
  `gender`          ENUM('MALE','FEMALE','UNISEX') NOT NULL DEFAULT 'UNISEX',
  `material`        VARCHAR(100) DEFAULT NULL,
  `approval_status` ENUM('PENDING','APPROVED','REJECTED','HIDDEN') NOT NULL DEFAULT 'PENDING'
                    COMMENT 'Manager kiểm duyệt trước khi hiển thị',
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`      DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prod_shop`     (`shop_id`),
  KEY `idx_prod_category` (`category_id`),
  CONSTRAINT `fk_prod_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_prod_cat`
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FIX: Bảng này có trong DROP nhưng THIẾU lệnh CREATE
-- ============================================================
CREATE TABLE `product_images` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT   NOT NULL,
  `image_url`  TEXT     NOT NULL,
  `alt_text`   VARCHAR(200) DEFAULT NULL,
  `sort_order` SMALLINT NOT NULL DEFAULT 0,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_pi_product` (`product_id`),
  CONSTRAINT `fk_pi_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================

CREATE TABLE `product_variants` (
  `id`         BIGINT        NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT        NOT NULL,
  `sku`        VARCHAR(100)  NOT NULL,
  `size`       VARCHAR(20)   NOT NULL,
  `color`      VARCHAR(50)   NOT NULL,
  `color_hex`  VARCHAR(20)   NOT NULL DEFAULT '#888888',
  `price`      DECIMAL(15,2) NOT NULL,
  `sale_price` DECIMAL(15,2) DEFAULT NULL,
  `stock_quantity` INT       NOT NULL DEFAULT 0,
  `is_active`  TINYINT(1)    NOT NULL DEFAULT 1,
  `image_url`  TEXT          DEFAULT NULL,
  `deleted_at` DATETIME      DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pv_sku` (`sku`),
  KEY `idx_pv_product` (`product_id`),
  CONSTRAINT `fk_pv_prod`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================

CREATE TABLE `product_reviews` (
  `id`             BIGINT   NOT NULL AUTO_INCREMENT,
  `product_id`     BIGINT   NOT NULL,
  `user_id`        BIGINT   NOT NULL,
  `shop_order_id`  BIGINT   NOT NULL COMMENT 'Chỉ cho phép review khi đơn đã DELIVERED',
  `rating`         TINYINT  NOT NULL COMMENT '1–5 sao',
  `comment`        TEXT     DEFAULT NULL,
  `vendor_reply`   TEXT     DEFAULT NULL,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`     DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_review_order_product` (`shop_order_id`, `product_id`)
    COMMENT 'Mỗi đơn hàng chỉ được review 1 lần cho mỗi sản phẩm',
  KEY `idx_rv_product` (`product_id`),
  KEY `idx_rv_user`    (`user_id`),
  CONSTRAINT `fk_rv_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)    ON DELETE CASCADE,
  CONSTRAINT `fk_rv_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)       ON DELETE CASCADE,
  CONSTRAINT `fk_rv_order`   FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rating`    CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 6: WISHLIST & GIỎ HÀNG
-- ************************************************************

-- FIX: Bảng này có trong DROP nhưng THIẾU lệnh CREATE
CREATE TABLE `wishlists` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT   NOT NULL,
  `product_id` BIGINT   NOT NULL,
  `added_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wishlist_user_product` (`user_id`, `product_id`),
  CONSTRAINT `fk_wl_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE,
  CONSTRAINT `fk_wl_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================

CREATE TABLE `cart_items` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT   NOT NULL,
  `variant_id` BIGINT   NOT NULL,
  `quantity`   INT      NOT NULL DEFAULT 1,
  `added_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cart_user_variant` (`user_id`, `variant_id`),
  CONSTRAINT `fk_ci_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)            ON DELETE CASCADE,
  CONSTRAINT `fk_ci_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 7: KHUYẾN MÃI (COUPONS)
-- ************************************************************

CREATE TABLE `coupons` (
  `id`               BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_id`          BIGINT        DEFAULT NULL
                     COMMENT 'NULL = mã toàn sàn (Admin/Manager tạo). Có ID = mã riêng Shop (Vendor tạo).',
  `code`             VARCHAR(50)   NOT NULL,
  `discount_type`    ENUM('PERCENT','FIXED') NOT NULL,
  `discount_value`   DECIMAL(15,2) NOT NULL,
  `max_discount`     DECIMAL(15,2) DEFAULT NULL
                     COMMENT 'Mức giảm tối đa (áp dụng khi discount_type = PERCENT)',
  `min_order_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `usage_limit`      INT           DEFAULT NULL COMMENT 'NULL = không giới hạn',
  `used_count`       INT           NOT NULL DEFAULT 0,
  `start_date`       DATETIME      NOT NULL,
  `end_date`         DATETIME      NOT NULL,
  `category_id`      BIGINT        DEFAULT NULL,
  `deleted_at`       DATETIME      DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coupon_code` (`code`),
  KEY `idx_coupon_shop` (`shop_id`),
  CONSTRAINT `fk_coupon_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 8: MARKETING — CAMPAIGNS & BANNERS (FIX: THIẾU HOÀN TOÀN)
-- ************************************************************

-- Chiến dịch Marketing toàn sàn — Manager tạo
CREATE TABLE `campaigns` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(200) NOT NULL COMMENT 'vd: Flash Sale 12/12, Siêu Sale Cuối Năm',
  `type`         ENUM('FLASH_SALE','SEASONAL','VOUCHER_RAIN','OTHER') NOT NULL DEFAULT 'OTHER',
  `description`  TEXT         DEFAULT NULL,
  `discount_rate` DECIMAL(5,2) DEFAULT NULL
                 COMMENT '% giảm áp dụng chung cho các sản phẩm trong chiến dịch (nếu có)',
  `start_time`   DATETIME     NOT NULL,
  `end_time`     DATETIME     NOT NULL,
  `status`       ENUM('DRAFT','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `created_by`   BIGINT       DEFAULT NULL COMMENT 'Manager/Admin tạo',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_status` (`status`),
  CONSTRAINT `fk_camp_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sản phẩm (variant) tham gia Flash sale — Vendor đăng ký, Manager duyệt
CREATE TABLE `campaign_products` (
  `id`              BIGINT        NOT NULL AUTO_INCREMENT,
  `campaign_id`     BIGINT        NOT NULL,
  `variant_id`      BIGINT        NOT NULL,
  `sale_price`      DECIMAL(15,2) NOT NULL COMMENT 'Giá Flash sale của biến thể này',
  `quantity_limit`  INT           DEFAULT NULL COMMENT 'Số lượng bán trong campaign (NULL = không giới hạn)',
  `sold_count`      INT           NOT NULL DEFAULT 0,
  `approval_status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cp_campaign_variant` (`campaign_id`, `variant_id`),
  CONSTRAINT `fk_cp_campaign`
    FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_cp_variant`
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Banner hiển thị trang chủ / danh mục — Manager tạo
CREATE TABLE `banners` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(200)  DEFAULT NULL,
  `image_url`   TEXT          NOT NULL,
  `link_url`    TEXT          DEFAULT NULL COMMENT 'URL đích khi người dùng click banner',
  `position`    ENUM('HOME_TOP','HOME_MID','CATEGORY_TOP','SIDEBAR') NOT NULL DEFAULT 'HOME_TOP',
  `sort_order`  SMALLINT      NOT NULL DEFAULT 0,
  `campaign_id` BIGINT        DEFAULT NULL COMMENT 'Liên kết chiến dịch nếu là banner Flash sale',
  `start_time`  DATETIME      DEFAULT NULL,
  `end_time`    DATETIME      DEFAULT NULL,
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `created_by`  BIGINT        DEFAULT NULL COMMENT 'Manager/Admin tạo',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banner_position` (`position`, `is_active`),
  CONSTRAINT `fk_banner_campaign`
    FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_banner_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 9: ĐƠN HÀNG (PARENT ORDER & SHOP ORDERS)
-- ************************************************************

-- Đơn hàng gốc — đại diện 1 lần Checkout của User
CREATE TABLE `parent_orders` (
  `id`              BIGINT        NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT        NOT NULL,
  `address_id`      BIGINT        DEFAULT NULL COMMENT 'Địa chỉ giao hàng (snapshot vào shipping_address)',
  `checkout_code`   VARCHAR(50)   NOT NULL,
  `total_amount`    DECIMAL(15,2) NOT NULL,
  `payment_method`  ENUM('COD','VNPAY','MOMO','CREDIT_CARD') NOT NULL,
  `payment_status`  ENUM('UNPAID','PAID','REFUNDED') NOT NULL DEFAULT 'UNPAID',
  `shipping_address` TEXT         NOT NULL COMMENT 'Snapshot địa chỉ tại thời điểm đặt hàng',
  `platform_coupon_id` BIGINT     DEFAULT NULL COMMENT 'Mã giảm giá toàn sàn áp dụng cho đơn này',
  `note`            TEXT          DEFAULT NULL COMMENT 'Ghi chú cho đơn hàng',
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_checkout_code` (`checkout_code`),
  KEY `idx_po_user` (`user_id`),
  CONSTRAINT `fk_parent_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT,
  CONSTRAINT `fk_parent_coupon`
    FOREIGN KEY (`platform_coupon_id`) REFERENCES `coupons`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shipper_reconciliations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `shipper_id` BIGINT NOT NULL,
  `amount_submitted` DECIMAL(15,2) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `confirmed_by` BIGINT DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sr_shipper` FOREIGN KEY (`shipper_id`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_sr_processor` FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Đơn hàng con — mỗi Shop 1 đơn, Shipper nhận đơn này
-- FIX: Thêm cod_amount_collected cho tính năng đối soát COD
-- ============================================================
CREATE TABLE `shop_orders` (
  `id`                   BIGINT        NOT NULL AUTO_INCREMENT,
  `parent_order_id`      BIGINT        NOT NULL,
  `shop_id`              BIGINT        NOT NULL,
  `shipper_id`           BIGINT        DEFAULT NULL,
  `shop_order_code`      VARCHAR(50)   NOT NULL,
  `subtotal`             DECIMAL(15,2) NOT NULL COMMENT 'Tiền hàng trước khi giảm',
  `shipping_fee`         DECIMAL(15,2) NOT NULL DEFAULT 0,
  `discount_amount`      DECIMAL(15,2) NOT NULL DEFAULT 0,
  `final_amount`         DECIMAL(15,2) NOT NULL COMMENT 'subtotal + shipping_fee - discount_amount',
  `commission_rate`      DECIMAL(5,2)  NOT NULL DEFAULT 10.00
                         COMMENT 'Tỷ lệ chiết khấu áp dụng tại thời điểm đặt hàng (snapshot)',
  `commission_amount`    DECIMAL(15,2) NOT NULL DEFAULT 0
                         COMMENT 'Số tiền chiết khấu thực tế = final_amount * commission_rate / 100',
  `cod_amount_collected` DECIMAL(15,2) DEFAULT NULL
                         COMMENT 'Số tiền COD Shipper thực thu từ khách. NULL nếu chưa thu hoặc không phải COD.',
  `cod_status`           ENUM('NOT_COD', 'HELD_BY_SHIPPER', 'SUBMITTED', 'CONFIRMED', 'MISMATCH') NOT NULL DEFAULT 'NOT_COD',
  `shipper_reconciliation_id` BIGINT DEFAULT NULL,
  `shop_coupon_id`       BIGINT        DEFAULT NULL COMMENT 'Mã giảm giá của Shop áp dụng cho đơn con này',
  `points_used`          INT           NOT NULL DEFAULT 0 COMMENT 'Số điểm tiêu thụ cho đơn nhỏ này',
  `points_earned`        INT           NOT NULL DEFAULT 0 COMMENT 'Số điểm sẽ được cộng khi giao thành công',
  `status`               ENUM(
                           'PENDING',
                           'CONFIRMED',
                           'PREPARING',
                           'SHIPPING',
                           'DELIVERED',
                           'COMPLETED',
                           'CANCEL_REQUESTED',
                           'CANCELLED',
                           'FAILED',
                           'RETURN_PENDING',
                           'RETURNED'
                         ) NOT NULL DEFAULT 'PENDING',
  `delivered_at`         DATETIME      DEFAULT NULL,
  `delivery_attempts`    INT           NOT NULL DEFAULT 0,
  `created_at`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shop_order_code` (`shop_order_code`),
  KEY `idx_so_parent`  (`parent_order_id`),
  KEY `idx_so_shop`    (`shop_id`),
  KEY `idx_so_shipper` (`shipper_id`),
  CONSTRAINT `fk_so_parent`
    FOREIGN KEY (`parent_order_id`) REFERENCES `parent_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_so_shop`
    FOREIGN KEY (`shop_id`)         REFERENCES `shops`(`id`)         ON DELETE RESTRICT,
  CONSTRAINT `fk_so_shipper`
    FOREIGN KEY (`shipper_id`)      REFERENCES `users`(`id`)         ON DELETE SET NULL,
  CONSTRAINT `fk_so_reconciliation`
    FOREIGN KEY (`shipper_reconciliation_id`) REFERENCES `shipper_reconciliations`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_so_shop_coupon`
    FOREIGN KEY (`shop_coupon_id`)  REFERENCES `coupons`(`id`)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lịch sử thay đổi trạng thái đơn hàng
CREATE TABLE `shop_order_status_history` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `shop_order_id` BIGINT       NOT NULL,
  `old_status`    VARCHAR(30)  DEFAULT NULL,
  `new_status`    VARCHAR(30)  NOT NULL,
  `note`          VARCHAR(255) DEFAULT NULL,
  `changed_by`    BIGINT       DEFAULT NULL COMMENT 'User thực hiện thay đổi (Vendor/Shipper/System)',
  `changed_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sosh_order` (`shop_order_id`),
  CONSTRAINT `fk_sosh_order`
    FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sosh_changer`
    FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chi tiết sản phẩm trong đơn (snapshot tại thời điểm mua)
CREATE TABLE `order_items` (
  `id`            BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_order_id` BIGINT        NOT NULL,
  `variant_id`    BIGINT        NOT NULL,
  `product_name`  VARCHAR(300)  NOT NULL COMMENT 'Snapshot tên sản phẩm',
  `sku`           VARCHAR(100)  NOT NULL COMMENT 'Snapshot SKU',
  `size`          VARCHAR(20)   NOT NULL COMMENT 'Snapshot size',
  `color`         VARCHAR(50)   NOT NULL COMMENT 'Snapshot màu',
  `quantity`      INT           NOT NULL,
  `unit_price`    DECIMAL(15,2) NOT NULL COMMENT 'Snapshot giá tại thời điểm mua',
  PRIMARY KEY (`id`),
  KEY `idx_oi_order`   (`shop_order_id`),
  KEY `idx_oi_variant` (`variant_id`),
  CONSTRAINT `fk_oi_shop_order`
    FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`)      ON DELETE CASCADE,
  CONSTRAINT `fk_oi_variant`
    FOREIGN KEY (`variant_id`)    REFERENCES `product_variants`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 10: ĐỔI TRẢ HÀNG HÓA
-- ************************************************************

CREATE TABLE `return_requests` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `shop_order_id` BIGINT       NOT NULL,
  `user_id`       BIGINT       NOT NULL,
  `reason`        TEXT         NOT NULL,
  `evidence_urls` TEXT         DEFAULT NULL COMMENT 'JSON array URLs ảnh/video bằng chứng',
  `status`        ENUM(
                    'PENDING',
                    'APPROVED_BY_SHOP',
                    'RESOLVED_BY_ADMIN',
                    'REJECTED',
                    'COMPLETED'
                  ) NOT NULL DEFAULT 'PENDING',
  `resolved_by`   BIGINT       DEFAULT NULL COMMENT 'Admin/Manager giải quyết',
  `resolve_note`  TEXT         DEFAULT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rr_order` (`shop_order_id`),
  KEY `idx_rr_user`  (`user_id`),
  CONSTRAINT `fk_rr_order`
    FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rr_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rr_resolver`
    FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================

CREATE TABLE `return_items` (
  `id`                BIGINT       NOT NULL AUTO_INCREMENT,
  `return_request_id` BIGINT       NOT NULL,
  `order_item_id`     BIGINT       NOT NULL,
  `quantity`          INT          DEFAULT NULL COMMENT 'Số lượng trả (NULL nếu dùng serial)',
  `serial_number`     VARCHAR(100) DEFAULT NULL COMMENT 'Mã định danh sản phẩm cao cấp (nếu có)',
  `condition_note`    VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ri_request`
    FOREIGN KEY (`return_request_id`) REFERENCES `return_requests`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ri_order_item`
    FOREIGN KEY (`order_item_id`)     REFERENCES `order_items`(`id`)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 11: TÀI CHÍNH & ĐỐI SOÁT (VENDOR PAYOUTS)
-- ************************************************************

-- Ví của Shop (balance = tiền đã có thể rút, pending = tiền đơn đang giao)
CREATE TABLE `shop_wallets` (
  `shop_id`         BIGINT        NOT NULL,
  `balance`         DECIMAL(15,2) NOT NULL DEFAULT 0.00
                    COMMENT 'Số dư có thể rút (đơn đã DELIVERED và qua thời gian chờ)',
  `pending_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00
                    COMMENT 'Doanh thu đang chờ xác nhận (đơn chưa DELIVERED)',
  `total_earned`    DECIMAL(15,2) NOT NULL DEFAULT 0.00
                    COMMENT 'Tổng doanh thu cộng dồn từ trước đến nay',
  PRIMARY KEY (`shop_id`),
  CONSTRAINT `fk_sw_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Yêu cầu rút tiền của Vendor
CREATE TABLE `shop_payouts` (
  `id`           BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_id`      BIGINT        NOT NULL,
  `amount`       DECIMAL(15,2) NOT NULL,
  `bank_name`    VARCHAR(100)  DEFAULT NULL,
  `bank_account` VARCHAR(255)  NOT NULL,
  `bank_account_name` VARCHAR(200) DEFAULT NULL,
  `status`       ENUM('PENDING','PROCESSING','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `processed_by` BIGINT        DEFAULT NULL COMMENT 'Admin/Manager duyệt',
  `reject_reason` VARCHAR(255) DEFAULT NULL,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sp_shop` (`shop_id`),
  CONSTRAINT `fk_sp_shop`
    FOREIGN KEY (`shop_id`)      REFERENCES `shops`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_admin`
    FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 12: CHAT (USER <-> VENDOR) (FIX: THIẾU HOÀN TOÀN)
-- ************************************************************

-- Mỗi cặp User–Shop có 1 conversation duy nhất
CREATE TABLE `conversations` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT   NOT NULL,
  `shop_id`    BIGINT   NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conv_user_shop` (`user_id`, `shop_id`),
  CONSTRAINT `fk_conv_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages` (
  `id`              BIGINT   NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT   NOT NULL,
  `sender_id`       BIGINT   NOT NULL COMMENT 'Có thể là User hoặc Vendor (user_id của tài khoản Vendor)',
  `body`            TEXT     NOT NULL,
  `attachment_url`  TEXT     DEFAULT NULL,
  `attachment_name` VARCHAR(255) DEFAULT NULL,
  `attachment_type` VARCHAR(100) DEFAULT NULL,
  `is_read`         TINYINT(1) NOT NULL DEFAULT 0,
  `sent_at`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_conv` (`conversation_id`),
  CONSTRAINT `fk_msg_conv`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender`
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payment_logs`;

-- ************************************************************
-- PHẦN 18: LỊCH SỬ THANH TOÁN (PAYMENT LOGS)
-- ************************************************************

CREATE TABLE `payment_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_code` VARCHAR(50) NOT NULL,
  `gateway_name` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `status` ENUM('PAID','UNPAID','FAILED','REFUNDED') NOT NULL DEFAULT 'UNPAID',
  `trans_id` VARCHAR(100) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `transaction_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_logs_order_code` (`order_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 19: BLOGS (TIN TỨC & XU HƯỚNG)
-- ************************************************************

CREATE TABLE `blogs` (
  `id`            BIGINT        NOT NULL AUTO_INCREMENT,
  `title`         VARCHAR(255)  NOT NULL,
  `slug`          VARCHAR(255)  NOT NULL,
  `summary`       TEXT          DEFAULT NULL,
  `content`       TEXT          NOT NULL COMMENT 'Lưu chuỗi JSON các khối nội dung của blog',
  `thumbnail_url` TEXT          DEFAULT NULL,
  `category`      VARCHAR(100)  NOT NULL,
  `status`        ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `author_id`     BIGINT        NOT NULL,
  `views_count`   INT           NOT NULL DEFAULT 0,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`    DATETIME      DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_slug` (`slug`),
  CONSTRAINT `fk_blog_author`
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 20: THÔNG BÁO (NOTIFICATIONS)
-- ************************************************************

CREATE TABLE `notifications` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT       NOT NULL,
  `title`      VARCHAR(255) NOT NULL,
  `content`    TEXT         NOT NULL,
  `type`       VARCHAR(50)  NOT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`),
  CONSTRAINT `fk_notif_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 20: VẬN CHUYỂN (SHIPMENTS & SHIPMENT HISTORIES)
-- ************************************************************

CREATE TABLE `shipments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `shop_order_id` BIGINT NOT NULL,
  `shipper_id` BIGINT DEFAULT NULL,
  `tracking_number` VARCHAR(100) DEFAULT NULL,
  `status` ENUM(
    'PENDING_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED',
    'RETURNED'
  ) DEFAULT 'PENDING_PICKUP',
  `shipping_fee` DECIMAL(10, 2) DEFAULT 0,
  `estimated_delivery_date` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shipment_tracking` (`tracking_number`),
  CONSTRAINT `fk_shipment_order` FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shipment_shipper` FOREIGN KEY (`shipper_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shipment_histories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `shipment_id` BIGINT NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `note` VARCHAR(500) DEFAULT NULL,
  `proof_image_url` VARCHAR(1000) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sh_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 21: REFRESH TOKENS
-- ************************************************************

CREATE TABLE `refresh_tokens` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT       NOT NULL,
  `token`      VARCHAR(512) NOT NULL,
  `expires_at` DATETIME     NOT NULL,
  `is_revoked` TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rt_user` (`user_id`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 22: OTP VERIFICATIONS
-- ************************************************************

CREATE TABLE `otp_verifications` (
  `id`           BIGINT      NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT      NOT NULL,
  `otp_code`     VARCHAR(10) NOT NULL,
  `type`         ENUM('PASSWORD_RECOVERY','ACCOUNT_ACTIVATION') NOT NULL,
  `expired_at`   DATETIME    NOT NULL,
  `attempts`     INT         NOT NULL DEFAULT 0,
  `is_used`      TINYINT(1)  NOT NULL DEFAULT 0,
  `locked_until` DATETIME    DEFAULT NULL,
  `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_user` (`user_id`),
  CONSTRAINT `fk_otp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 23: LOGIN LOGS
-- ************************************************************

CREATE TABLE `login_logs` (
  `id`             BIGINT      NOT NULL AUTO_INCREMENT,
  `email_or_phone` VARCHAR(150) NOT NULL,
  `ip_address`     VARCHAR(45) DEFAULT NULL,
  `status`         ENUM('SUCCESS','FAILED') NOT NULL,
  `attempted_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 24: ACTIVITY LOGS
-- ************************************************************

CREATE TABLE `activity_logs` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT       DEFAULT NULL,
  `email`       VARCHAR(150) DEFAULT NULL,
  `action_type` VARCHAR(50)  NOT NULL,
  `entity_type` VARCHAR(50)  DEFAULT NULL,
  `entity_id`   VARCHAR(50)  DEFAULT NULL,
  `description` TEXT         NOT NULL,
  `details`     TEXT         DEFAULT NULL,
  `ip_address`  VARCHAR(45)  DEFAULT NULL,
  `user_agent`  VARCHAR(255) DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_al_user` (`user_id`),
  CONSTRAINT `fk_al_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 25: USER VIEWED PRODUCTS
-- ************************************************************

CREATE TABLE `user_viewed_products` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT   NOT NULL,
  `product_id` BIGINT   NOT NULL,
  `viewed_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_uvp_user` (`user_id`),
  KEY `idx_uvp_product` (`product_id`),
  CONSTRAINT `fk_uvp_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE,
  CONSTRAINT `fk_uvp_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ************************************************************
-- PHẦN 26: USER COUPONS
-- ************************************************************

CREATE TABLE `user_coupons` (
  `id`         BIGINT     NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT     NOT NULL,
  `coupon_id`  BIGINT     NOT NULL,
  `is_used`    TINYINT(1) NOT NULL DEFAULT 0,
  `saved_at`   DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at`    DATETIME   DEFAULT NULL,
  `created_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_coupon` (`user_id`, `coupon_id`),
  CONSTRAINT `fk_uc_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`(`id`)   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_uc_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF SCHEMA
-- Total tables: 40
-- ============================================================
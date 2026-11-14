-- ============================================================
-- FULLSTACK03 - Multi-Vendor Fashion E-Commerce (Marketplace)
-- Complete Database Schema — MySQL 8.x
-- Chuẩn hóa & Tối ưu: Áp dụng chiến lược lai (Hybrid Normalization)
-- Tổng số bảng: 45
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;


-- ************************************************************
-- PHẦN 1: NGƯỜI DÙNG & PHÂN QUYỀN (USERS, ROLES & AUTH)
-- ************************************************************

CREATE TABLE `roles` (
  `id`        INT         NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL COMMENT 'admin | manager | vendor | shipper | user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id`               BIGINT       NOT NULL AUTO_INCREMENT,
  `email`            VARCHAR(150) NOT NULL,
  `phone`            VARCHAR(20)  DEFAULT NULL,
  `password`         VARCHAR(255) DEFAULT NULL,
  `role_id`          INT          NOT NULL,
  `status`           ENUM('PENDING','ACTIVE','LOCKED') NOT NULL DEFAULT 'PENDING',
  `auth_provider`    VARCHAR(50)  DEFAULT 'local',
  `auth_provider_id` VARCHAR(255) DEFAULT NULL,
  `loyalty_points`   INT          NOT NULL DEFAULT 0,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`       DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  KEY `idx_users_role` (`role_id`),
  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_profiles` (
  `user_id`         BIGINT       NOT NULL,
  `full_name`       VARCHAR(200) DEFAULT NULL,
  `avatar_url`      TEXT         DEFAULT NULL,
  `gender`          ENUM('MALE','FEMALE','OTHER') DEFAULT NULL,
  `birthday`        DATE         DEFAULT NULL,
  `shipper_shop_id` BIGINT       DEFAULT NULL COMMENT 'Giai đoạn chuyển tiếp: Dần thay thế bởi shipper_profiles',
  `operating_areas` JSON         DEFAULT NULL COMMENT 'Giai đoạn chuyển tiếp: Dần thay thế bởi shipper_operating_areas',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chuẩn hóa Hạng mục 21: Tách hồ sơ riêng cho Shipper (tránh sparse column ở user_profiles)
CREATE TABLE `shipper_profiles` (
  `user_id`         BIGINT   NOT NULL,
  `shipper_shop_id` BIGINT   DEFAULT NULL COMMENT 'Shop mà Shipper trực thuộc (nếu là shipper riêng của Shop)',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_sp_shop` (`shipper_shop_id`),
  CONSTRAINT `fk_sp_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sp_shipper_shop`
    FOREIGN KEY (`shipper_shop_id`) REFERENCES `shops`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chuẩn hóa Hạng mục 22: Tách khu vực hoạt động của Shipper đạt chuẩn 1NF (thay cho JSON)
CREATE TABLE `shipper_operating_areas` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `shipper_id` BIGINT       NOT NULL,
  `province`   VARCHAR(100) NOT NULL,
  `district`   VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_soa_shipper_area` (`shipper_id`, `province`, `district`),
  KEY `idx_soa_area` (`province`, `district`),
  CONSTRAINT `fk_soa_shipper`
    FOREIGN KEY (`shipper_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_addresses` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `receiver_name` VARCHAR(200) NOT NULL,
  `phone`         VARCHAR(20)  NOT NULL,
  `province`      VARCHAR(100) NOT NULL,
  `district`      VARCHAR(100) NOT NULL,
  `ward`          VARCHAR(100) NOT NULL,
  `street`        VARCHAR(255) DEFAULT NULL,
  `is_default`    TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_addr_user` (`user_id`),
  CONSTRAINT `fk_addr_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refresh_tokens` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT       NOT NULL,
  `token`      VARCHAR(512) NOT NULL,
  `expires_at` DATETIME     NOT NULL,
  `is_revoked` TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rt_user` (`user_id`),
  CONSTRAINT `fk_rt_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT `fk_otp_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `login_logs` (
  `id`             BIGINT      NOT NULL AUTO_INCREMENT,
  `email_or_phone` VARCHAR(150) NOT NULL,
  `ip_address`     VARCHAR(45) DEFAULT NULL,
  `status`         ENUM('SUCCESS','FAILED') NOT NULL,
  `attempted_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activity_logs` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT       DEFAULT NULL,
  `email`       VARCHAR(150) DEFAULT NULL COMMENT 'SNAPSHOT: Email tại thời điểm hành động; log bảo toàn dù tài khoản đổi email/bị xóa',
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
  CONSTRAINT `fk_al_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 2: CẤU HÌNH HỆ THỐNG & GIAN HÀNG (SYSTEM & SHOPS)
-- ************************************************************

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

-- Hạng mục 18: Bảng nhật ký đối soát hằng đêm (Reconciliation Audit Trail)
CREATE TABLE `reconciliation_logs` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `table_name`    VARCHAR(100) NOT NULL COMMENT 'Tên bảng được đối soát',
  `record_id`     BIGINT       NOT NULL COMMENT 'ID bản ghi phát hiện lệch',
  `field`         VARCHAR(100) NOT NULL COMMENT 'Cột dữ liệu bị lệch',
  `old_value`     TEXT         DEFAULT NULL COMMENT 'Giá trị hiện tại trong DB',
  `correct_value` TEXT         DEFAULT NULL COMMENT 'Giá trị tính toán đúng từ nguồn gốc',
  `action`        ENUM('fixed','alerted') NOT NULL DEFAULT 'alerted',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rec_table_record` (`table_name`, `record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hạng mục 14: Thêm rating_sum và rating_count để tính rating nguyên tử
CREATE TABLE `shops` (
  `id`                BIGINT       NOT NULL AUTO_INCREMENT,
  `vendor_id`         BIGINT       NOT NULL COMMENT 'User có role = vendor',
  `shop_name`         VARCHAR(200) NOT NULL,
  `shop_logo`         TEXT         DEFAULT NULL,
  `description`       TEXT         DEFAULT NULL,
  `status`            ENUM('PENDING','APPROVED','REJECTED','BANNED') NOT NULL DEFAULT 'PENDING',
  `rating`            DECIMAL(3,2) NOT NULL DEFAULT 0.00 COMMENT 'CACHE: Điểm đánh giá trung bình = rating_sum / NULLIF(rating_count, 0)',
  `rating_sum`        INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'CACHE: Tổng số sao đánh giá tích lũy',
  `rating_count`      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'CACHE: Tổng số lượt đánh giá',
  `bank_name`         VARCHAR(100) DEFAULT NULL,
  `bank_account_no`   VARCHAR(50)  DEFAULT NULL,
  `bank_account_name` VARCHAR(200) DEFAULT NULL,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shop_name` (`shop_name`),
  KEY `idx_shop_vendor` (`vendor_id`),
  CONSTRAINT `fk_shop_vendor`
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
-- PHẦN 3: DANH MỤC & SẢN PHẨM (CATALOG & PRODUCTS)
-- ************************************************************

CREATE TABLE `categories` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(200) NOT NULL,
  `slug`        VARCHAR(250) UNIQUE DEFAULT NULL,
  `image_url`   TEXT         DEFAULT NULL,
  `description` TEXT         DEFAULT NULL,
  `parent_id`   INT          DEFAULT NULL COMMENT 'NULL = Root category. Admin quản lý.',
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cat_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hạng mục 12 & 13: Lưu cache sold_count và view_count có cơ chế kiểm soát
CREATE TABLE `products` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `shop_id`         BIGINT       NOT NULL,
  `category_id`     INT          DEFAULT NULL,
  `name`            VARCHAR(300) NOT NULL,
  `slug`            VARCHAR(350) UNIQUE DEFAULT NULL,
  `description`     TEXT         DEFAULT NULL,
  `price`           DECIMAL(15,2) NOT NULL DEFAULT 0,
  `sale_price`      DECIMAL(15,2) DEFAULT NULL,
  `sold_count`      INT          NOT NULL DEFAULT 0 COMMENT 'CACHE: Lượng bán tích lũy, cập nhật bất đồng bộ qua event',
  `view_count`      INT          NOT NULL DEFAULT 0 COMMENT 'CACHE: Lượt xem tích lũy, buffer qua Redis rồi flush theo batch',
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

CREATE TABLE `product_variants` (
  `id`             BIGINT        NOT NULL AUTO_INCREMENT,
  `product_id`     BIGINT        NOT NULL,
  `sku`            VARCHAR(100)  NOT NULL,
  `size`           VARCHAR(20)   NOT NULL,
  `color`          VARCHAR(50)   NOT NULL,
  `color_hex`      VARCHAR(20)   NOT NULL DEFAULT '#888888',
  `price`          DECIMAL(15,2) NOT NULL,
  `sale_price`     DECIMAL(15,2) DEFAULT NULL,
  `stock_quantity` INT           NOT NULL DEFAULT 0,
  `is_active`      TINYINT(1)    NOT NULL DEFAULT 1,
  `image_url`      TEXT          DEFAULT NULL,
  `deleted_at`     DATETIME      DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pv_sku` (`sku`),
  KEY `idx_pv_product` (`product_id`),
  CONSTRAINT `fk_pv_prod`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT `fk_rv_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rv_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE,
  CONSTRAINT `fk_rv_order`   FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rating`    CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 4: TƯƠNG TÁC SẢN PHẨM & GIỎ HÀNG (INTERACTIONS & CART)
-- ************************************************************

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
-- PHẦN 5: KHUYẾN MÃI (COUPONS & USER VOUCHERS)
-- ************************************************************

-- Hạng mục 15: used_count cập nhật atomic, có ràng buộc usage_limit
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
  `used_count`       INT           NOT NULL DEFAULT 0 COMMENT 'CACHE: Số lượt đã sử dụng (atomic increment)',
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


-- ************************************************************
-- PHẦN 6: MARKETING — CAMPAIGNS & BANNERS
-- ************************************************************

CREATE TABLE `campaigns` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(200) NOT NULL COMMENT 'vd: Flash Sale 12/12, Siêu Sale Cuối Năm',
  `type`          ENUM('FLASH_SALE','SEASONAL','VOUCHER_RAIN','OTHER') NOT NULL DEFAULT 'OTHER',
  `description`   TEXT         DEFAULT NULL,
  `discount_rate` DECIMAL(5,2) DEFAULT NULL
                  COMMENT '% giảm áp dụng chung cho các sản phẩm trong chiến dịch (nếu có)',
  `start_time`    DATETIME     NOT NULL,
  `end_time`      DATETIME     NOT NULL,
  `status`        ENUM('DRAFT','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `created_by`    BIGINT       DEFAULT NULL COMMENT 'Manager/Admin tạo',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_status` (`status`),
  CONSTRAINT `fk_camp_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hạng mục 16: sold_count cập nhật atomic, chống bán vượt quota flash sale
CREATE TABLE `campaign_products` (
  `id`              BIGINT        NOT NULL AUTO_INCREMENT,
  `campaign_id`     BIGINT        NOT NULL,
  `variant_id`      BIGINT        NOT NULL,
  `sale_price`      DECIMAL(15,2) NOT NULL COMMENT 'Giá Flash sale của biến thể này',
  `quantity_limit`  INT           DEFAULT NULL COMMENT 'Số lượng bán trong campaign (NULL = không giới hạn)',
  `sold_count`      INT           NOT NULL DEFAULT 0 COMMENT 'CACHE: Số lượng đã bán trong campaign (atomic check quota)',
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
-- PHẦN 7: ĐƠN HÀNG & ĐỐI SOÁT (ORDERS & RECONCILIATIONS)
-- ************************************************************

-- Hạng mục 5 & 6: total_amount bất biến; shipping_address là SNAPSHOT chính thức
CREATE TABLE `parent_orders` (
  `id`                 BIGINT        NOT NULL AUTO_INCREMENT,
  `user_id`            BIGINT        NOT NULL,
  `address_id`         BIGINT        DEFAULT NULL COMMENT 'Địa chỉ gốc tham chiếu/thống kê',
  `checkout_code`      VARCHAR(50)   NOT NULL,
  `total_amount`       DECIMAL(15,2) NOT NULL COMMENT 'Bất biến: Tổng tiền tại thời điểm tạo đơn, chặn UPDATE',
  `payment_method`     ENUM('COD','VNPAY','MOMO','CREDIT_CARD') NOT NULL,
  `payment_status`     ENUM('UNPAID','PAID','REFUNDED') NOT NULL DEFAULT 'UNPAID',
  `shipping_address`   TEXT          NOT NULL COMMENT 'SNAPSHOT: Bản ghi địa chỉ nhận hàng chính thức tại thời điểm đặt, không đồng bộ ngược',
  `platform_coupon_id` BIGINT        DEFAULT NULL COMMENT 'Mã giảm giá toàn sàn áp dụng cho đơn này',
  `note`               TEXT          DEFAULT NULL COMMENT 'Ghi chú cho đơn hàng',
  `created_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `id`               BIGINT        NOT NULL AUTO_INCREMENT,
  `shipper_id`       BIGINT        NOT NULL,
  `amount_submitted` DECIMAL(15,2) NOT NULL,
  `status`           ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `confirmed_by`     BIGINT        DEFAULT NULL,
  `note`             TEXT          DEFAULT NULL,
  `created_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sr_shipper`
    FOREIGN KEY (`shipper_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_sr_processor`
    FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hạng mục 1, 2, 3: final_amount và commission_amount là GENERATED STORED; commission_rate là SNAPSHOT
CREATE TABLE `shop_orders` (
  `id`                        BIGINT        NOT NULL AUTO_INCREMENT,
  `parent_order_id`           BIGINT        NOT NULL,
  `shop_id`                   BIGINT        NOT NULL,
  `shipper_id`                BIGINT        DEFAULT NULL,
  `shop_order_code`           VARCHAR(50)   NOT NULL,
  `subtotal`                  DECIMAL(15,2) NOT NULL COMMENT 'Tiền hàng trước khi giảm',
  `shipping_fee`              DECIMAL(15,2) NOT NULL DEFAULT 0,
  `discount_amount`           DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Tổng giảm giá (Shop coupon + phân bổ Global/Points)',
  `commission_rate`           DECIMAL(5,2)  NOT NULL DEFAULT 10.00
                              COMMENT 'SNAPSHOT: Tỷ lệ chiết khấu áp dụng tại thời điểm đặt hàng, không đồng bộ ngược',
  `final_amount`              DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(`subtotal` + `shipping_fee` - `discount_amount`, 2)) STORED
                              COMMENT 'GENERATED STORED: subtotal + shipping_fee - discount_amount',
  `commission_amount`         DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(`final_amount` * `commission_rate` / 100, 2)) STORED
                              COMMENT 'GENERATED STORED: final_amount * commission_rate / 100',
  `cod_amount_collected`      DECIMAL(15,2) DEFAULT NULL
                              COMMENT 'Số tiền COD Shipper thực thu từ khách. NULL nếu chưa thu hoặc không phải COD.',
  `cod_status`                ENUM('NOT_COD', 'HELD_BY_SHIPPER', 'SUBMITTED', 'CONFIRMED', 'MISMATCH') NOT NULL DEFAULT 'NOT_COD',
  `shipper_reconciliation_id` BIGINT        DEFAULT NULL,
  `shop_coupon_id`            BIGINT        DEFAULT NULL COMMENT 'Mã giảm giá của Shop áp dụng cho đơn con này',
  `points_used`               INT           NOT NULL DEFAULT 0 COMMENT 'Số điểm tiêu thụ cho đơn nhỏ này',
  `points_earned`             INT           NOT NULL DEFAULT 0 COMMENT 'Số điểm sẽ được cộng khi giao thành công',
  `status`                    ENUM(
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
  `delivered_at`              DATETIME      DEFAULT NULL,
  `delivery_attempts`         INT           NOT NULL DEFAULT 0,
  `created_at`                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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

-- Hạng mục 6: SNAPSHOT bảo toàn thông tin hàng hóa tại thời điểm giao dịch
CREATE TABLE `order_items` (
  `id`            BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_order_id` BIGINT        NOT NULL,
  `variant_id`    BIGINT        NOT NULL,
  `product_name`  VARCHAR(300)  NOT NULL COMMENT 'SNAPSHOT: Tên sản phẩm tại thời điểm mua, không đồng bộ ngược',
  `sku`           VARCHAR(100)  NOT NULL COMMENT 'SNAPSHOT: SKU biến thể tại thời điểm mua, không đồng bộ ngược',
  `size`          VARCHAR(20)   NOT NULL COMMENT 'SNAPSHOT: Size tại thời điểm mua, không đồng bộ ngược',
  `color`         VARCHAR(50)   NOT NULL COMMENT 'SNAPSHOT: Màu sắc tại thời điểm mua, không đồng bộ ngược',
  `quantity`      INT           NOT NULL,
  `unit_price`    DECIMAL(15,2) NOT NULL COMMENT 'SNAPSHOT: Đơn giá tại thời điểm mua, không đồng bộ ngược',
  PRIMARY KEY (`id`),
  KEY `idx_oi_order`   (`shop_order_id`),
  KEY `idx_oi_variant` (`variant_id`),
  CONSTRAINT `fk_oi_shop_order`
    FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`)      ON DELETE CASCADE,
  CONSTRAINT `fk_oi_variant`
    FOREIGN KEY (`variant_id`)    REFERENCES `product_variants`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 8: VẬN CHUYỂN & LỊCH SỬ THANH TOÁN (LOGISTICS & PAYMENTS)
-- ************************************************************

CREATE TABLE `shipments` (
  `id`                     BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_order_id`          BIGINT        NOT NULL,
  `shipper_id`             BIGINT        DEFAULT NULL,
  `tracking_number`        VARCHAR(100)  DEFAULT NULL,
  `status`                 ENUM(
                             'PENDING_PICKUP',
                             'PICKED_UP',
                             'IN_TRANSIT',
                             'OUT_FOR_DELIVERY',
                             'DELIVERED',
                             'FAILED',
                             'RETURNED'
                           ) DEFAULT 'PENDING_PICKUP',
  `shipping_fee`           DECIMAL(10,2) DEFAULT 0,
  `estimated_delivery_date` DATETIME     DEFAULT NULL,
  `created_at`             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shipment_tracking` (`tracking_number`),
  CONSTRAINT `fk_shipment_order`
    FOREIGN KEY (`shop_order_id`) REFERENCES `shop_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shipment_shipper`
    FOREIGN KEY (`shipper_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shipment_histories` (
  `id`              BIGINT        NOT NULL AUTO_INCREMENT,
  `shipment_id`     BIGINT        NOT NULL,
  `status`          VARCHAR(50)   NOT NULL,
  `location`        VARCHAR(255)  DEFAULT NULL,
  `note`            VARCHAR(500)  DEFAULT NULL,
  `proof_image_url` VARCHAR(1000) DEFAULT NULL,
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sh_shipment`
    FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_logs` (
  `id`               BIGINT        NOT NULL AUTO_INCREMENT,
  `order_code`       VARCHAR(50)   NOT NULL,
  `gateway_name`     VARCHAR(50)   NOT NULL,
  `amount`           DECIMAL(15,2) NOT NULL,
  `status`           ENUM('PAID','UNPAID','FAILED','REFUNDED') NOT NULL DEFAULT 'UNPAID',
  `trans_id`         VARCHAR(100)  DEFAULT NULL,
  `message`          TEXT          DEFAULT NULL,
  `transaction_time` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_logs_order_code` (`order_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 9: ĐỔI TRẢ & TÀI CHÍNH GIAN HÀNG (RETURNS & WALLETS)
-- ************************************************************

CREATE TABLE `return_requests` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `shop_order_id` BIGINT       NOT NULL,
  `user_id`       BIGINT       NOT NULL COMMENT 'Dư thừa có kiểm soát: phục vụ truy vấn đơn đổi trả của tôi nhanh chóng mà không cần JOIN shop_orders -> parent_orders',
  `reason`        TEXT         NOT NULL,
  `evidence_urls` TEXT         DEFAULT NULL COMMENT 'Giai đoạn chuyển tiếp: Dần thay thế bởi bảng return_evidence_media',
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

-- Chuẩn hóa Hạng mục 23: Tách danh sách hình ảnh/video bằng chứng đổi trả đạt chuẩn 1NF
CREATE TABLE `return_evidence_media` (
  `id`                BIGINT        NOT NULL AUTO_INCREMENT,
  `return_request_id` BIGINT        NOT NULL,
  `media_url`         TEXT          NOT NULL,
  `media_type`        ENUM('image', 'video') NOT NULL DEFAULT 'image',
  `sort_order`        SMALLINT      NOT NULL DEFAULT 0,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rem_request` (`return_request_id`),
  CONSTRAINT `fk_rem_request`
    FOREIGN KEY (`return_request_id`) REFERENCES `return_requests`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Hạng mục 7: Bảng Sổ cái biến động số dư (Append-only Ledger)
CREATE TABLE `wallet_transactions` (
  `id`              BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_id`         BIGINT        NOT NULL,
  `type`            ENUM('order_income','commission','payout','refund','adjust','opening_balance') NOT NULL,
  `amount`          DECIMAL(15,2) NOT NULL COMMENT 'Dương = cộng tiền vào ví, Âm = trừ tiền khỏi ví',
  `balance_after`   DECIMAL(15,2) NOT NULL COMMENT 'Số dư ví ngay sau giao dịch',
  `ref_type`        VARCHAR(50)   DEFAULT NULL COMMENT 'shop_orders, shop_payouts, return_requests...',
  `ref_id`          BIGINT        DEFAULT NULL,
  `idempotency_key` VARCHAR(100)  NOT NULL,
  `note`            TEXT          DEFAULT NULL,
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wt_idempotency` (`idempotency_key`),
  KEY `idx_wt_shop_created` (`shop_id`, `created_at`),
  CONSTRAINT `fk_wt_shop`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shop_payouts` (
  `id`                BIGINT        NOT NULL AUTO_INCREMENT,
  `shop_id`           BIGINT        NOT NULL,
  `amount`            DECIMAL(15,2) NOT NULL,
  `bank_name`         VARCHAR(100)  DEFAULT NULL,
  `bank_account`      VARCHAR(255)  NOT NULL,
  `bank_account_name` VARCHAR(200)  DEFAULT NULL,
  `status`            ENUM('PENDING','PROCESSING','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `processed_by`      BIGINT        DEFAULT NULL COMMENT 'Admin/Manager duyệt',
  `reject_reason`     VARCHAR(255)  DEFAULT NULL,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sp_shop` (`shop_id`),
  CONSTRAINT `fk_sp_shop`
    FOREIGN KEY (`shop_id`)      REFERENCES `shops`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_admin`
    FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ************************************************************
-- PHẦN 10: GIAO TIẾP & NỘI DUNG (COMMUNICATION & CONTENT)
-- ************************************************************

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
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT       NOT NULL,
  `sender_id`       BIGINT       NOT NULL COMMENT 'User hoặc Vendor (user_id của tài khoản Vendor)',
  `body`            TEXT         NOT NULL,
  `attachment_url`  TEXT         DEFAULT NULL,
  `attachment_name` VARCHAR(255) DEFAULT NULL,
  `attachment_type` VARCHAR(100) DEFAULT NULL,
  `is_read`         TINYINT(1)   NOT NULL DEFAULT 0,
  `sent_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_conv` (`conversation_id`),
  CONSTRAINT `fk_msg_conv`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender`
    FOREIGN KEY (`sender_id`)       REFERENCES `users`(`id`)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ============================================================
-- END OF SCHEMA — Total tables: 45
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
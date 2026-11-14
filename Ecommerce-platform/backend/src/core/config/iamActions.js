/**
 * IAM Actions Catalog & Default System Policies
 * Thiết kế theo chuẩn AWS IAM (Action format: 'service:action' hoặc 'service:*' hoặc '*')
 */

export const IAM_ACTIONS = {
  // 1. Quản lý IAM (Dành riêng cho Root Admin)
  IAM_ALL: "iam:*",
  IAM_MANAGE: "iam:manage",
  IAM_READ: "iam:read",

  // 2. Quản lý Tài khoản (User Management)
  USER_ALL: "user:*",
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_LOCK: "user:lock",
  USER_UNLOCK: "user:unlock",

  // 3. Phê duyệt & Quản lý Shop (Vendor Onboarding)
  SHOP_ALL: "shop:*",
  SHOP_READ: "shop:read",
  SHOP_APPROVE: "shop:approve",
  SHOP_REJECT: "shop:reject",
  SHOP_UPDATE: "shop:update",

  // 4. Cấu hình hệ thống & Danh mục (System & Categories)
  SYSTEM_SETTINGS_READ: "system:settings:read",
  SYSTEM_SETTINGS_UPDATE: "system:settings:update",
  CATEGORY_ALL: "category:*",
  CATEGORY_READ: "category:read",
  CATEGORY_CREATE: "category:create",
  CATEGORY_UPDATE: "category:update",
  CATEGORY_DELETE: "category:delete",

  // 5. Quản lý Sản phẩm & Kiểm duyệt (Product Moderation)
  PRODUCT_ALL: "product:*",
  PRODUCT_READ: "product:read",
  PRODUCT_APPROVE: "product:approve",
  PRODUCT_REJECT: "product:reject",

  // 6. Quản lý Đơn hàng & Vận hành (Order Operations)
  ORDER_ALL: "order:*",
  ORDER_READ: "order:read",
  ORDER_MANAGE: "order:manage",

  // 7. Tranh chấp & Đổi trả (Disputes & Returns)
  DISPUTE_ALL: "dispute:*",
  DISPUTE_READ: "dispute:read",
  DISPUTE_RESOLVE: "dispute:resolve",
  RETURN_ALL: "return:*",
  RETURN_READ: "return:read",
  RETURN_RESOLVE: "return:resolve",

  // 8. Khuyến mãi & Chiến dịch (Campaigns & Vouchers)
  MARKETING_ALL: "marketing:*",
  VOUCHER_READ: "voucher:read",
  VOUCHER_MANAGE: "voucher:manage",
  CAMPAIGN_READ: "campaign:read",
  CAMPAIGN_MANAGE: "campaign:manage",

  // 9. Tài chính, Ví tiền & Quyết toán (Finance & Treasury)
  FINANCE_ALL: "finance:*",
  FINANCE_REPORT_READ: "finance:report:read",
  FINANCE_RECONCILIATION_READ: "finance:reconciliation:read",
  FINANCE_PAYOUT_APPROVE: "finance:payout:approve",
  FINANCE_PAYOUT_REJECT: "finance:payout:reject",
  FINANCE_SHIPPER_RECONCILIATION_APPROVE: "finance:shipper_reconciliation:approve",
  FINANCE_SHIPPER_RECONCILIATION_REJECT: "finance:shipper_reconciliation:reject",
  FINANCE_DISBURSE: "finance:disburse",
  FINANCE_LOGS_READ: "finance:logs:read",

  // 10. Thống kê & Báo cáo vận hành
  STATS_READ: "stats:read",
  REPORTS_READ: "reports:read",
};

/**
 * Danh sách System Policies khởi tạo mặc định
 */
export const DEFAULT_SYSTEM_POLICIES = [
  {
    name: "AdministratorAccess",
    code: "ADMIN_FULL_ACCESS",
    description: "Cung cấp toàn bộ quyền truy cập tối cao vào mọi dịch vụ và tài nguyên trong hệ sinh thái",
    effect: "ALLOW",
    actions: ["*"],
    is_system: true,
  },
  {
    name: "OrderManagementPolicy",
    code: "ORDER_MANAGEMENT",
    description: "Quyền quản lý đơn hàng, giải quyết tranh chấp và xử lý yêu cầu đổi trả hoàn tiền",
    effect: "ALLOW",
    actions: [
      "order:read",
      "order:manage",
      "dispute:read",
      "dispute:resolve",
      "return:read",
      "return:resolve",
      "stats:read",
    ],
    is_system: true,
  },
  {
    name: "ProductModerationPolicy",
    code: "PRODUCT_MODERATION",
    description: "Quyền kiểm duyệt sản phẩm của vendor, quản lý cây danh mục sản phẩm",
    effect: "ALLOW",
    actions: [
      "product:read",
      "product:approve",
      "product:reject",
      "category:read",
      "category:create",
      "category:update",
      "stats:read",
    ],
    is_system: true,
  },
  {
    name: "FinanceAuditorPolicy",
    code: "FINANCE_AUDITOR",
    description: "Quyền xem báo cáo tài chính, đối soát thanh toán và phê duyệt giải ngân ví shop",
    effect: "ALLOW",
    actions: [
      "finance:*",
      "shop:read",
      "stats:read",
      "reports:read",
    ],
    is_system: true,
  },
  {
    name: "ShopModeratorPolicy",
    code: "SHOP_MODERATOR",
    description: "Quyền thẩm định và phê duyệt mở gian hàng cho vendor mới",
    effect: "ALLOW",
    actions: [
      "shop:read",
      "shop:approve",
      "shop:reject",
      "user:read",
    ],
    is_system: true,
  },
  {
    name: "MarketingCampaignPolicy",
    code: "MARKETING_CAMPAIGN",
    description: "Quyền quản lý chiến dịch khuyến mãi toàn sàn và voucher giảm giá",
    effect: "ALLOW",
    actions: [
      "voucher:read",
      "voucher:manage",
      "campaign:read",
      "campaign:manage",
      "stats:read",
    ],
    is_system: true,
  },
  {
    name: "CustomerSupportPolicy",
    code: "CUSTOMER_SUPPORT",
    description: "Quyền hỗ trợ khách hàng, tra cứu đơn hàng và tiếp nhận xử lý khiếu nại",
    effect: "ALLOW",
    actions: [
      "user:read",
      "order:read",
      "dispute:read",
      "return:read",
    ],
    is_system: true,
  },
];


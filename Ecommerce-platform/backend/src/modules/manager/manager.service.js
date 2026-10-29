import db from "../../database/models/index.js";
import notificationService from "../notification/notification.service.js";

const getStats = async () => {
  const pendingProducts = await db.Product.count({ where: { approval_status: "PENDING" } });
  const pendingDisputes = await db.ReturnRequest.count({ where: { status: "PENDING" } });
  const platformVouchers = await db.Coupon.count({ where: { shop_id: null } });
  const bannedShops = await db.Shop.count({ where: { status: "BANNED" } });

  const pendingShops = await db.Shop.count({ where: { status: "PENDING" } });
  const totalOrders = await db.ShopOrder.count();

  // Tổng doanh thu sàn (tổng hoa hồng từ các đơn đã giao)
  const deliveredOrders = await db.ShopOrder.findAll({
    where: { status: "DELIVERED" },
    attributes: ["commission_amount"],
  });
  const totalRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.commission_amount || 0), 0);

  return {
    pendingProducts,
    pendingDisputes,
    platformVouchers,
    bannedShops,
    pendingShops,
    totalOrders,
    totalRevenue,
  };
};

const getPendingProducts = async () => {
  return await db.Product.findAll({
    where: { approval_status: "PENDING" },
    include: [
      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name", "shop_logo"],
      },
      {
        model: db.ProductImage,
        as: "images",
        attributes: ["image_url"],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const getActiveProducts = async () => {
  const { Op } = db.Sequelize;
  return await db.Product.findAll({
    where: {
      approval_status: { [Op.in]: ["APPROVED", "HIDDEN", "REJECTED"] }
    },
    include: [
      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name", "shop_logo"],
      },
      {
        model: db.ProductImage,
        as: "images",
        attributes: ["image_url"],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const updateProductStatus = async (productId, status) => {
  const product = await db.Product.findByPk(productId);
  if (!product) throw new Error("Sản phẩm không tồn tại");

  if (!["APPROVED", "REJECTED", "PENDING", "HIDDEN"].includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }


  await product.update({ approval_status: status });

  try {
    const shop = await db.Shop.findByPk(product.shop_id);
    if (shop && shop.vendor_id) {
      let title = "";
      let content = "";
      if (status === "APPROVED") {
        title = "Sản phẩm được phê duyệt";
        content = `Sản phẩm "${product.name}" của bạn đã được kiểm duyệt thành công và đã hiển thị công khai trên sàn.`;
      } else if (status === "REJECTED") {
        title = "Sản phẩm bị từ chối phê duyệt";
        content = `Sản phẩm "${product.name}" của bạn đã bị từ chối kiểm duyệt bởi Ban quản lý.`;
      } else if (status === "HIDDEN") {
        title = "Sản phẩm bị ẩn";
        content = `Sản phẩm "${product.name}" của bạn đã được chuyển sang trạng thái ẩn.`;
      }

      if (title && content) {
        await notificationService.createNotification(shop.vendor_id, title, content, "PRODUCT_STATUS");
      }
    }
  } catch (notifErr) {
    console.error("Failed to notify vendor of product status change:", notifErr);
  }

  return product;
};

const getDisputes = async () => {
  return await db.ReturnRequest.findAll({
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "email", "phone"],
        include: [
          {
            model: db.UserProfile,
            as: "profile",
            attributes: ["full_name"],
          },
        ],
      },
      {
        model: db.ShopOrder,
        as: "shopOrder",
        attributes: ["id", "shop_order_code", "final_amount"],
        include: [
          {
            model: db.Shop,
            as: "shop",
            attributes: ["id", "shop_name"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const resolveDispute = async (disputeId, status, resolvedBy) => {
  const dispute = await db.ReturnRequest.findByPk(disputeId);
  if (!dispute) throw new Error("Yêu cầu khiếu nại không tồn tại");

  if (!["RESOLVED_BY_ADMIN", "REJECTED"].includes(status)) {
    throw new Error("Trạng thái giải quyết khiếu nại không hợp lệ");
  }

  await dispute.update({
    status,
    resolved_by: resolvedBy,
    resolve_note: status === "RESOLVED_BY_ADMIN" ? "Đã duyệt hoàn tiền bởi Quản trị viên hệ thống" : "Từ chối khiếu nại bởi Quản trị viên hệ thống",
  });
  return dispute;
};

const getVouchers = async () => {
  return await db.Coupon.findAll({
    where: { shop_id: null },
    include: [
      {
        model: db.Category,
        as: "category",
        attributes: ["id", "name"],
      }
    ],
    order: [["id", "DESC"]],
  });
};

const createVoucher = async (voucherData) => {
  const {
    code,
    discount_type,
    discount_value,
    max_discount,
    min_order_amount,
    usage_limit,
    start_date,
    end_date,
    category_id
  } = voucherData;

  if (!code || !discount_type || discount_value === undefined) {
    throw new Error("Thiếu thông tin tạo mã giảm giá");
  }

  // Validate discount type
  if (discount_type !== "PERCENT" && discount_type !== "FIXED") {
    throw new Error("Loại giảm giá không hợp lệ");
  }

  const dVal = Number(discount_value);
  if (isNaN(dVal) || dVal <= 0) {
    throw new Error("Mức giảm phải lớn hơn 0");
  }

  if (discount_type === "PERCENT" && dVal > 100) {
    throw new Error("Mức giảm phần trăm không thể vượt quá 100%");
  }

  const minOrder = Number(min_order_amount || 0);
  if (isNaN(minOrder) || minOrder < 0) {
    throw new Error("Đơn tối thiểu không hợp lệ");
  }

  if (discount_type === "FIXED" && dVal > minOrder) {
    throw new Error("Mức giảm giá tiền mặt không được lớn hơn số tiền tối thiểu của đơn hàng");
  }

  let limit = null;
  if (usage_limit !== undefined && usage_limit !== null && usage_limit !== "") {
    limit = Number(usage_limit);
    if (isNaN(limit) || limit <= 0) {
      throw new Error("Giới hạn lượt dùng phải lớn hơn 0");
    }
  }

  let maxDisc = null;
  if (discount_type === "PERCENT" && max_discount !== undefined && max_discount !== null && max_discount !== "") {
    maxDisc = Number(max_discount);
    if (isNaN(maxDisc) || maxDisc < 0) {
      throw new Error("Mức giảm tối đa không hợp lệ");
    }
  }

  if (!start_date || !end_date) {
    throw new Error("Vui lòng nhập ngày bắt đầu và kết thúc");
  }

  const sDate = new Date(start_date);
  const eDate = new Date(end_date);

  if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
    throw new Error("Định dạng ngày bắt đầu hoặc ngày kết thúc không hợp lệ");
  }

  if (sDate >= eDate) {
    throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
  }

  // Kiểm tra mã voucher trùng
  const existing = await db.Coupon.findOne({ where: { code: code.toUpperCase().trim() } });
  if (existing) throw new Error("Mã giảm giá này đã tồn tại trên hệ thống");

  return await db.Coupon.create({
    shop_id: null, // Platform-wide
    code: code.toUpperCase().trim(),
    discount_type,
    discount_value: dVal,
    max_discount: maxDisc,
    min_order_amount: minOrder,
    usage_limit: limit,
    start_date: sDate,
    end_date: eDate,
    category_id: category_id ? Number(category_id) : null,
  });
};

const deleteVoucher = async (id) => {
  if (!id) throw new Error("Thiếu ID mã giảm giá");
  const voucher = await db.Coupon.findOne({ where: { id, shop_id: null } });
  if (!voucher) throw new Error("Không tìm thấy mã giảm giá sàn");

  await voucher.destroy();
  return true;
};

const getCampaigns = async () => {
  return await db.Campaign.findAll({
    order: [["id", "DESC"]],
  });
};

const createCampaign = async (campaignData) => {
  const { title, type, date } = campaignData;
  if (!title) throw new Error("Thiếu tên chiến dịch");

  // Map frontend type to model ENUM ("FLASH_SALE", "SEASONAL", "VOUCHER_RAIN", "OTHER")
  let mappedType = "OTHER";
  if (type === "Flash sale") mappedType = "FLASH_SALE";
  else if (type === "Banner Marketing") mappedType = "SEASONAL";

  let start_time = new Date();
  let end_time = new Date(new Date().setDate(new Date().getDate() + 7)); // 7 ngày

  if (date) {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      start_time = parsedDate;
      end_time = new Date(parsedDate.setDate(parsedDate.getDate() + 7));
    }
  }

  return await db.Campaign.create({
    name: title,
    type: mappedType,
    description: `Loại chiến dịch: ${type || 'Khác'}`,
    start_time: start_time,
    end_time: end_time,
    status: "DRAFT", // ENUM defines DRAFT, ACTIVE, ENDED, CANCELLED
  });
};

const getVendors = async () => {
  return await db.Shop.findAll({
    include: [
      {
        model: db.User,
        as: "vendor",
        attributes: ["id", "email", "phone"],
        include: [
          {
            model: db.UserProfile,
            as: "profile",
            attributes: ["full_name"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const updateVendorStatus = async (shopId, status, reason) => {
  const shop = await db.Shop.findByPk(shopId);
  if (!shop) throw new Error("Gian hàng không tồn tại");

  if (!["APPROVED", "BANNED", "PENDING", "REJECTED"].includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }

  await shop.update({ status });

  if (status === "BANNED") {
    console.log(`[AUDIT LOG] Shop "${shop.shop_name}" (ID: ${shop.id}) was BANNED. Reason: ${reason || "No reason provided"}`);
  } else {
    console.log(`[AUDIT LOG] Shop "${shop.shop_name}" (ID: ${shop.id}) was UNBANNED. Reason: ${reason || "No reason provided"}`);
  }

  try {
    let title = "";
    let content = "";
    if (status === "BANNED") {
      title = "Gian hàng của bạn đã bị khóa";
      content = `Gian hàng "${shop.shop_name}" của bạn đã bị KHÓA hoạt động trên sàn. Lý do: ${reason || "Vi phạm điều khoản chính sách của sàn."}`;
    } else if (status === "APPROVED") {
      title = "Gian hàng được mở khóa hoạt động";
      content = `Gian hàng "${shop.shop_name}" của bạn đã được mở khóa và có thể tiếp tục hoạt động bán hàng bình thường.`;
    }

    if (title && content) {
      await notificationService.createNotification(shop.vendor_id, title, content, "SHOP_STATUS");
    }
  } catch (notifErr) {
    console.error("Failed to notify vendor of shop status change:", notifErr);
  }

  return shop;
};

const getReviews = async () => {
  return await db.ProductReview.findAll({
    paranoid: false,
    include: [
      { model: db.User, as: "user", attributes: ["id", "email"], include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }] },
      { model: db.Product, as: "product", attributes: ["id", "name"], include: [{ model: db.Shop, as: "shop", attributes: ["shop_name"] }] },
    ],
    order: [["created_at", "DESC"]],
  });
};

const deleteReview = async (id) => {
  const review = await db.ProductReview.findByPk(id);
  if (!review) throw new Error("Đánh giá không tồn tại");

  await review.destroy();
  return true;
};

const restoreReview = async (id) => {
  const review = await db.ProductReview.findByPk(id, { paranoid: false });
  if (!review) throw new Error("Đánh giá không tồn tại");

  await review.restore();
  return true;
};

const getReportOverview = async (month, year) => {
  const { Op } = db.Sequelize;

  const now = new Date();
  const activeMonth = month ? parseInt(month) : (now.getMonth() + 1);
  const activeYear = year ? parseInt(year) : now.getFullYear();

  const startDate = new Date(activeYear, activeMonth - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(activeYear, activeMonth, 0, 23, 59, 59, 999);

  // 1. Lấy toàn bộ shop để lập báo cáo
  const shops = await db.Shop.findAll({
    include: [
      {
        model: db.User,
        as: "vendor",
        attributes: ["id", "email"],
        include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }],
      },
    ],
  });

  // 2. Tính doanh thu của từng shop từ OrderItem
  const orderItems = await db.OrderItem.findAll({
    include: [
      {
        model: db.ShopOrder,
        as: "shopOrder",
        where: {
          status: { [Op.ne]: "CANCELLED" },
          [Op.or]: [
            { delivered_at: { [Op.between]: [startDate, endDate] } },
            {
              delivered_at: null,
              updated_at: { [Op.between]: [startDate, endDate] }
            }
          ]
        },
        attributes: ["shop_id", "status"],
        required: true,
      },
    ],
    attributes: ["unit_price", "quantity"],
  });

  const shopRevenueMap = {};
  orderItems.forEach((item) => {
    const shopId = item.shopOrder.shop_id;
    if (!shopRevenueMap[shopId]) shopRevenueMap[shopId] = 0;
    shopRevenueMap[shopId] += parseFloat(item.unit_price) * item.quantity;
  });

  // 3. Tính số đơn hàng và tổng hoa hồng của từng shop (không tính CANCELLED)
  const shopOrderCounts = await db.ShopOrder.findAll({
    where: {
      status: { [Op.ne]: "CANCELLED" },
      [Op.or]: [
        { delivered_at: { [Op.between]: [startDate, endDate] } },
        {
          delivered_at: null,
          updated_at: { [Op.between]: [startDate, endDate] }
        }
      ]
    },
    attributes: [
      "shop_id",
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "orderCount"],
      [db.sequelize.fn("SUM", db.sequelize.col("commission_amount")), "commissionSum"],
    ],
    group: ["shop_id"],
    raw: true,
  });

  const orderCountMap = {};
  const commissionMap = {};
  shopOrderCounts.forEach((row) => {
    orderCountMap[row.shop_id] = parseInt(row.orderCount || 0);
    commissionMap[row.shop_id] = parseFloat(row.commissionSum || 0);
  });

  // 4. Lấy lịch sử rút tiền đã duyệt (COMPLETED)
  const completedPayouts = await db.ShopPayout.findAll({
    where: {
      status: "COMPLETED",
      created_at: { [Op.between]: [startDate, endDate] },
    },
    attributes: ["shop_id", "amount"],
  });
  const paidPayoutMap = {};
  completedPayouts.forEach((p) => {
    if (!paidPayoutMap[p.shop_id]) paidPayoutMap[p.shop_id] = 0;
    paidPayoutMap[p.shop_id] += parseFloat(p.amount);
  });

  // 5. Lấy lịch sử rút tiền đang chờ duyệt (PENDING, PROCESSING)
  const pendingPayouts = await db.ShopPayout.findAll({
    where: {
      status: { [Op.in]: ["PENDING", "PROCESSING"] },
      created_at: { [Op.between]: [startDate, endDate] },
    },
    attributes: ["shop_id", "amount"],
  });
  const pendingPayoutMap = {};
  pendingPayouts.forEach((p) => {
    if (!pendingPayoutMap[p.shop_id]) pendingPayoutMap[p.shop_id] = 0;
    pendingPayoutMap[p.shop_id] += parseFloat(p.amount);
  });

  // 6. Tính toán báo cáo cho từng Shop
  const shopReports = [];
  let totalAvailableWaitingForWithdraw = 0;

  shops.forEach((shop) => {
    const grossRevenue = shopRevenueMap[shop.id] || 0;
    const commissionAmount = commissionMap[shop.id] || (grossRevenue * 0.1); // mặc định 10% nếu thiếu
    const netRevenue = grossRevenue - commissionAmount;
    const paidPayout = paidPayoutMap[shop.id] || 0;
    const pendingPayout = pendingPayoutMap[shop.id] || 0;
    const availableBalance = Math.max(0, netRevenue - paidPayout - pendingPayout);

    totalAvailableWaitingForWithdraw += availableBalance;

    shopReports.push({
      shop_id: shop.id,
      shop_name: shop.shop_name,
      vendor_name: shop.vendor?.profile?.full_name || shop.vendor?.email || "N/A",
      vendor_email: shop.vendor?.email || "N/A",
      order_count: orderCountMap[shop.id] || 0,
      gross_revenue: grossRevenue,
      commission_amount: commissionAmount,
      net_revenue: netRevenue,
      paid_payout: paidPayout,
      pending_payout: pendingPayout,
      available_balance: availableBalance,
    });
  });

  // 7. Lấy danh sách toàn bộ sản phẩm để tính bán chạy / bán ế
  const products = await db.Product.findAll({
    where: { approval_status: "APPROVED" },
    include: [
      { model: db.ProductVariant, as: "variants", attributes: ["stock_quantity", "price"] },
      { model: db.Shop, as: "shop", attributes: ["shop_name"] },
      { model: db.Category, as: "category", attributes: ["name"] },
    ],
  });

  // 8. Lấy toàn bộ order items không bị hủy để tính số lượng bán và doanh thu sản phẩm
  const allSales = await db.OrderItem.findAll({
    include: [
      {
        model: db.ShopOrder,
        as: "shopOrder",
        where: {
          status: { [Op.ne]: "CANCELLED" },
          [Op.or]: [
            { delivered_at: { [Op.between]: [startDate, endDate] } },
            {
              delivered_at: null,
              updated_at: { [Op.between]: [startDate, endDate] }
            }
          ]
        },
        required: true,
        attributes: ["id"],
      },
      {
        model: db.ProductVariant,
        as: "variant",
        required: true,
        attributes: ["product_id", "price"],
        include: [{
          model: db.Product,
          as: "product",
          attributes: ["id", "name"],
          include: [{
            model: db.Category,
            as: "category",
            attributes: ["name"],
          }]
        }]
      }
    ],
    attributes: ["quantity", "unit_price"],
  });

  const salesMap = {};
  const revenueMap = {};
  const priceSumMap = {};
  const priceCountMap = {};
  const categoryRevenueMap = {};

  allSales.forEach((item) => {
    const prodId = item.variant?.product_id;
    if (prodId) {
      const qty = item.quantity || 0;
      const price = parseFloat(item.unit_price || item.variant.price || 0);

      if (!salesMap[prodId]) salesMap[prodId] = 0;
      salesMap[prodId] += qty;

      if (!revenueMap[prodId]) revenueMap[prodId] = 0;
      revenueMap[prodId] += qty * price;

      if (!priceSumMap[prodId]) {
        priceSumMap[prodId] = 0;
        priceCountMap[prodId] = 0;
      }
      priceSumMap[prodId] += price;
      priceCountMap[prodId] += 1;

      // Doanh thu theo danh mục
      const catName = item.variant?.product?.category?.name || "Khác";
      if (!categoryRevenueMap[catName]) {
        categoryRevenueMap[catName] = {
          category_name: catName,
          total_revenue: 0,
          units_sold: 0,
        };
      }
      categoryRevenueMap[catName].total_revenue += qty * price;
      categoryRevenueMap[catName].units_sold += qty;
    }
  });

  const categoryRevenues = Object.values(categoryRevenueMap).sort((a, b) => b.total_revenue - a.total_revenue);

  // 9. Lập danh sách sản phẩm
  const productStats = products.map((product) => {
    const totalSold = salesMap[product.id] || 0;
    const totalRevenue = revenueMap[product.id] || 0;
    const avgPrice = priceCountMap[product.id]
      ? priceSumMap[product.id] / priceCountMap[product.id]
      : parseFloat(product.price || 0);
    const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock_quantity || 0), 0) || 0;

    return {
      product_id: product.id,
      product_name: product.name,
      shop_name: product.shop?.shop_name || "N/A",
      category_name: product.category?.name || "N/A",
      total_sold: totalSold,
      total_revenue: totalRevenue,
      avg_price: avgPrice,
      stock_quantity: totalStock,
      created_at: product.created_at,
    };
  });

  // Bán chạy: Số lượng bán giảm dần
  const bestSellers = [...productStats]
    .filter((p) => p.total_sold > 0)
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 20);

  // Bán ế: Số lượng bán tăng dần, nếu bằng nhau thì ưu tiên tồn kho nhiều nhất
  const slowSellers = [...productStats]
    .sort((a, b) => {
      if (a.total_sold !== b.total_sold) {
        return a.total_sold - b.total_sold;
      }
      return b.stock_quantity - a.stock_quantity;
    })
    .slice(0, 20);

  return {
    totalAvailableWaitingForWithdraw,
    shopReports,
    bestSellers,
    slowSellers,
    categoryRevenues,
  };
};

export default {
  getStats,
  getReportOverview,
  getPendingProducts,
  getActiveProducts,
  updateProductStatus,
  getDisputes,
  resolveDispute,
  getVouchers,
  createVoucher,
  deleteVoucher,
  getCampaigns,
  createCampaign,
  getVendors,
  updateVendorStatus,
  getReviews,
  deleteReview,
  restoreReview,
};

import db from "../../database/models/index.js";
import { Op } from "sequelize";
import notificationService from "../notification/notification.service.js";

const registerShop = async (userId, shopData) => {
  const transaction = await db.sequelize.transaction();
  try {
    const existingShop = await db.Shop.findOne({
      where: {
        [Op.or]: [
          { vendor_id: userId },
          { shop_name: shopData.name },
        ],
      },
      paranoid: false,
      transaction,
    });

    let shop;
    if (existingShop && existingShop.deleted_at) {
      await existingShop.restore({ transaction });
      shop = await existingShop.update({
        shop_name: shopData.name,
        shop_logo: shopData.avatar_url || existingShop.shop_logo,
        description: shopData.description || existingShop.description,
        status: "PENDING",
      }, { transaction });
    } else if (existingShop && existingShop.status === "REJECTED") {
      shop = await existingShop.update({
        shop_name: shopData.name,
        shop_logo: shopData.avatar_url || existingShop.shop_logo,
        description: shopData.description || existingShop.description,
        status: "PENDING",
      }, { transaction });
    } else if (existingShop) {
      throw new Error("Bạn đã có gian hàng hoặc tên gian hàng đã tồn tại");
    } else {
      shop = await db.Shop.create(
        {
          vendor_id: userId,
          shop_name: shopData.name,
          shop_logo: shopData.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200",
          description: shopData.description || "",
          status: "PENDING",
        },
        { transaction }
      );
    }

    await transaction.commit();

    try {
      await notificationService.createNotificationForRole(
        "admin",
        "Yêu cầu đăng ký gian hàng mới",
        `Gian hàng "${shopData.name}" đang chờ duyệt đăng ký hoạt động.`,
        "SHOP_STATUS"
      );
    } catch (notifErr) {
      console.error("Failed to create admin registration notification:", notifErr);
    }

    return shop;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getShopProfile = async (shopId) => {
  const shop = await db.Shop.findByPk(shopId);
  if (!shop) return null;

  const productsCount = await db.Product.count({
    where: { shop_id: shopId, approval_status: "APPROVED" },
  });

  const reviewsCount = await db.ProductReview.count({
    include: [
      {
        model: db.Product,
        as: "product",
        where: { shop_id: shopId },
        required: true,
      },
    ],
  });

  return {
    ...shop.toJSON(),
    productsCount,
    reviewsCount,
  };
};

const getShopByUserId = async (userId) => {
  return await db.Shop.findOne({ where: { vendor_id: userId } });
};

const getTopShops = async (limit = 10) => {
  return await db.Shop.findAll({
    where: { status: "APPROVED" },
    order: [["rating", "DESC"]],
    limit: Number(limit) || 10,
    attributes: ["id", "shop_name", "shop_logo", "description", "rating", "status"],
  });
};

const updateShop = async (userId, shopData) => {
  const shop = await db.Shop.findOne({ where: { vendor_id: userId } });
  if (!shop) throw new Error("Shop not found");
  return await shop.update(shopData);
};

const getShopStatistics = async (shopId) => {
  const orderItems = await db.OrderItem.findAll({
    include: [
      {
        model: db.ShopOrder,
        as: "shopOrder",
        where: { shop_id: shopId, status: { [Op.ne]: "CANCELLED" } },
        required: true,
      },
    ],
  });

  // Lấy các yêu cầu trả hàng đã thành công để trừ doanh thu biểu đồ
  const completedReturns = await db.ReturnRequest.findAll({
    where: {
      status: ["COMPLETED", "RESOLVED_BY_ADMIN"]
    },
    include: [
      {
        model: db.ShopOrder,
        as: "shopOrder",
        where: { shop_id: shopId, status: "RETURNED" },
        required: true
      },
      {
        model: db.ReturnItem,
        as: "items",
        include: [{ model: db.OrderItem, as: "orderItem" }]
      }
    ]
  });

  const returnedAmountByOrder = {};
  completedReturns.forEach(req => {
    let reqTotal = 0;
    req.items.forEach(item => {
      reqTotal += parseFloat(item.quantity * item.orderItem.unit_price || 0);
    });
    returnedAmountByOrder[req.shop_order_id] = reqTotal;
  });

  // Đếm đơn hàng độc nhất
  const orderIds = new Set();
  orderItems.forEach((item) => {
    orderIds.add(item.shop_order_id);
  });

  const productsCount = await db.Product.count({
    where: { shop_id: shopId, approval_status: "APPROVED" },
  });

  // Doanh thu 7 ngày qua (trừ hàng trả lại)
  const dailyRevenue = Array(7).fill(0);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - (6 - i));
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(today);
    dayEnd.setDate(today.getDate() - (6 - i));
    dayEnd.setHours(23, 59, 59, 999);

    const dayOrderIds = new Set();
    for (const item of orderItems) {
      const itemDate = new Date(item.shopOrder.created_at);
      if (itemDate >= dayStart && itemDate <= dayEnd) {
        dailyRevenue[i] += parseFloat(item.unit_price * item.quantity || 0);
        dayOrderIds.add(item.shop_order_id);
      }
    }

    // Trừ đi giá trị hàng bị trả của các đơn hàng trong ngày này
    dayOrderIds.forEach(orderId => {
      if (returnedAmountByOrder[orderId]) {
        dailyRevenue[i] -= returnedAmountByOrder[orderId];
      }
    });
  }

  const commentsCount = db.sequelize.models.ProductReview
    ? await db.sequelize.models.ProductReview.count({
      include: [
        {
          model: db.Product,
          as: "product",
          where: { shop_id: shopId },
          required: true,
        },
      ],
    })
    : 12;

  const [wallet] = await db.ShopWallet.findOrCreate({
    where: { shop_id: shopId },
    defaults: { balance: 0, pending_balance: 0, total_earned: 0 }
  });

  const approvedWithdrawals = await db.ShopPayout.sum("amount", {
    where: { shop_id: shopId, status: "COMPLETED" }
  }) || 0;

  const availableBalance = parseFloat(wallet.balance || 0);

  return {
    revenue: parseFloat(wallet.total_earned || 0),
    pendingBalance: parseFloat(wallet.pending_balance || 0),
    availableBalance: availableBalance,
    withdrawnAmount: parseFloat(approvedWithdrawals || 0),
    netRevenue: availableBalance,
    ordersCount: orderIds.size,
    productsCount,
    commentsCount,
    dailyRevenue,
  };
};

const getShopOrders = async (shopId) => {
  return await db.ShopOrder.findAll({
    where: { shop_id: shopId },
    include: [
      {
        model: db.OrderItem,
        as: "items",
      },
      {
        model: db.ParentOrder,
        as: "parentOrder",
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["id", "email"],
            include: [
              {
                model: db.UserProfile,
                as: "profile",
                attributes: ["full_name"],
              },
            ],
          }
        ]
      }
    ],
    order: [["created_at", "DESC"]],
  });
};

const createShopProduct = async (shopId, productData) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      name,
      category_id,
      description,
      price,
      sale_price,
      gender,
      material,
      variants,
      images,
      is_new,
      is_featured,
    } = productData;

    const slug =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-") +
      "-" +
      Date.now();

    let finalPrice = price || 0;
    let finalSalePrice = sale_price || null;

    if (variants && variants.length > 0) {
      let lowestVariant = variants[0];
      let lowestEffPrice = Number(
        lowestVariant.sale_price !== undefined && lowestVariant.sale_price !== null && lowestVariant.sale_price !== ""
          ? lowestVariant.sale_price
          : lowestVariant.price
      );

      variants.forEach((v) => {
        const hasSale = v.sale_price !== undefined && v.sale_price !== null && v.sale_price !== "";
        const effPrice = Number(hasSale ? v.sale_price : v.price);
        if (effPrice < lowestEffPrice) {
          lowestEffPrice = effPrice;
          lowestVariant = v;
        }
      });

      finalPrice = Number(lowestVariant.price);
      finalSalePrice =
        lowestVariant.sale_price !== undefined && lowestVariant.sale_price !== null && lowestVariant.sale_price !== ""
          ? Number(lowestVariant.sale_price)
          : null;
    }

    const product = await db.Product.create(
      {
        name,
        category_id: category_id || null,
        slug,
        description: description || "",
        price: finalPrice,
        sale_price: finalSalePrice,
        gender: gender || "UNISEX",
        material: material || "",
        shop_id: shopId,
        approval_status: "PENDING",
        is_new: is_new !== undefined ? !!is_new : false,
        is_featured: is_featured !== undefined ? !!is_featured : false,
      },
      { transaction }
    );

    if (variants && variants.length > 0) {
      await db.ProductVariant.bulkCreate(
        variants.map((v, i) => ({
          product_id: product.id,
          sku: v.sku || `SKU-${product.id}-${v.size}-${v.color}-${i}-${Date.now()}`,
          size: v.size || "Free Size",
          color: v.color || "Default",
          price: v.price || 0,
          sale_price: v.sale_price !== undefined && v.sale_price !== null && v.sale_price !== "" ? Number(v.sale_price) : null,
          color_hex: v.color_hex || "#888888",
          image_url: v.image_url || null,
          stock_quantity: v.stock_quantity || 0,
          is_active: true,
        })),
        { transaction }
      );
    } else {
      await db.ProductVariant.create(
        {
          product_id: product.id,
          sku: `SKU-${product.id}-${Date.now()}`,
          size: "Free Size",
          color: "Default",
          color_hex: "#888888",
          price: price || 0,
          sale_price: sale_price || null,
          image_url: productData.image_url || null,
          stock_quantity: productData.stock_quantity || 10,
          is_active: true,
        },
        { transaction }
      );
    }

    let finalImages = [];
    if (images && images.length > 0) {
      finalImages.push(...images.map((img) => img.image_url));
    }
    if (variants && variants.length > 0) {
      variants.forEach((v) => {
        if (v.image_url && !finalImages.includes(v.image_url)) {
          finalImages.push(v.image_url);
        }
      });
    }

    if (finalImages.length > 0) {
      const primaryInputImage = images ? images.find((img) => img.is_primary) : null;
      const primaryUrl = primaryInputImage ? primaryInputImage.image_url : null;
      const activePrimaryUrl = finalImages.includes(primaryUrl) ? primaryUrl : finalImages[0];

      await db.ProductImage.bulkCreate(
        finalImages.map((imgUrl, i) => ({
          product_id: product.id,
          image_url: imgUrl,
          alt_text: product.name,
          sort_order: i,
          is_primary: imgUrl === activePrimaryUrl,
        })),
        { transaction }
      );
    } else {
      await db.ProductImage.create(
        {
          product_id: product.id,
          image_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400",
          alt_text: product.name,
          sort_order: 0,
          is_primary: true,
        },
        { transaction }
      );
    }

    await transaction.commit();

    try {
      const shop = await db.Shop.findByPk(shopId);
      await notificationService.createNotificationForRole(
        "manager",
        "Sản phẩm mới chờ phê duyệt",
        `Sản phẩm "${name}" của Shop "${shop?.shop_name || "Cửa hàng"}" đang chờ kiểm duyệt trước khi đăng bán.`,
        "PRODUCT_STATUS"
      );
    } catch (notifErr) {
      console.error("Failed to create manager product notification:", notifErr);
    }

    return product;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateShopProduct = async (shopId, productId, productData) => {
  const transaction = await db.sequelize.transaction();
  try {
    const product = await db.Product.findOne({
      where: { id: productId, shop_id: shopId },
      transaction,
    });
    if (!product) throw new Error("Product not found or not owned by shop");
    const {
      name,
      category_id,
      description,
      price,
      sale_price,
      gender,
      material,
      variants,
      images,
      approval_status,
      is_new,
      is_featured,
    } = productData;

    let finalPrice = price !== undefined ? price : product.price;
    let finalSalePrice = sale_price !== undefined ? sale_price : product.sale_price;

    if (variants && variants.length > 0) {
      let lowestVariant = variants[0];
      let lowestEffPrice = Number(
        lowestVariant.sale_price !== undefined && lowestVariant.sale_price !== null && lowestVariant.sale_price !== ""
          ? lowestVariant.sale_price
          : lowestVariant.price
      );

      variants.forEach((v) => {
        const hasSale = v.sale_price !== undefined && v.sale_price !== null && v.sale_price !== "";
        const effPrice = Number(hasSale ? v.sale_price : v.price);
        if (effPrice < lowestEffPrice) {
          lowestEffPrice = effPrice;
          lowestVariant = v;
        }
      });

      finalPrice = Number(lowestVariant.price);
      finalSalePrice =
        lowestVariant.sale_price !== undefined && lowestVariant.sale_price !== null && lowestVariant.sale_price !== ""
          ? Number(lowestVariant.sale_price)
          : null;
    }

    let finalApprovalStatus = product.approval_status;
    if (product.approval_status === "APPROVED" || product.approval_status === "REJECTED") {
      finalApprovalStatus = "PENDING";
    }
    if (approval_status) {
      finalApprovalStatus = approval_status;
    }

    await product.update(
      {
        name: name || product.name,
        category_id: category_id || product.category_id,
        description: description !== undefined ? description : product.description,
        price: finalPrice,
        sale_price: finalSalePrice,
        gender: gender || product.gender,
        material: material !== undefined ? material : product.material,
        approval_status: finalApprovalStatus,
        is_new: is_new !== undefined ? !!is_new : product.is_new,
        is_featured: is_featured !== undefined ? !!is_featured : product.is_featured,
      },
      { transaction }
    );

    if (variants) {
      await db.ProductVariant.destroy({
        where: { product_id: product.id },
        transaction,
        force: true,
      });
      await db.ProductVariant.bulkCreate(
        variants.map((v, i) => ({
          product_id: product.id,
          sku: v.sku || `SKU-${product.id}-${v.size}-${v.color}-${i}-${Date.now()}`,
          size: v.size || "Free Size",
          color: v.color || "Default",
          price: v.price || 0,
          sale_price: v.sale_price !== undefined && v.sale_price !== null && v.sale_price !== "" ? Number(v.sale_price) : null,
          color_hex: v.color_hex || "#888888",
          image_url: v.image_url || null,
          stock_quantity: v.stock_quantity || 0,
          is_active: true,
        })),
        { transaction }
      );
    }

    if (images) {
      await db.ProductImage.destroy({
        where: { product_id: product.id },
        transaction,
      });

      let finalImages = [];
      finalImages.push(...images.map((img) => img.image_url));

      const currentVariants = variants || (await db.ProductVariant.findAll({ where: { product_id: product.id }, transaction }));
      currentVariants.forEach((v) => {
        if (v.image_url && !finalImages.includes(v.image_url)) {
          finalImages.push(v.image_url);
        }
      });

      const primaryInputImage = images.find((img) => img.is_primary);
      const primaryUrl = primaryInputImage ? primaryInputImage.image_url : null;
      const activePrimaryUrl = finalImages.includes(primaryUrl) ? primaryUrl : finalImages[0];

      await db.ProductImage.bulkCreate(
        finalImages.map((imgUrl, i) => ({
          product_id: product.id,
          image_url: imgUrl,
          alt_text: product.name,
          sort_order: i,
          is_primary: imgUrl === activePrimaryUrl,
        })),
        { transaction }
      );
    }

    await transaction.commit();

    try {
      if (finalApprovalStatus === "PENDING") {
        const shop = await db.Shop.findByPk(shopId);
        await notificationService.createNotificationForRole(
          "manager",
          "Sản phẩm cập nhật chờ phê duyệt",
          `Sản phẩm "${product.name}" của Shop "${shop?.shop_name || "Cửa hàng"}" vừa cập nhật và đang chờ kiểm duyệt lại.`,
          "PRODUCT_STATUS"
        );
      }
    } catch (notifErr) {
      console.error("Failed to create manager update product notification:", notifErr);
    }

    return product;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteShopProduct = async (shopId, productId) => {
  const product = await db.Product.findOne({
    where: { id: productId, shop_id: shopId },
  });
  if (!product) throw new Error("Product not found or not owned by shop");
  await db.ProductVariant.destroy({ where: { product_id: product.id } });
  return await product.destroy();
};

const getShopReviews = async (shopId) => {
  return await db.ProductReview.findAll({
    include: [
      {
        model: db.Product,
        as: "product",
        where: { shop_id: shopId },
        attributes: ["id", "name"],
        required: true,
      },
      {
        model: db.User,
        as: "user",
        attributes: ["id", "email"],
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

const replyToReview = async (shopId, reviewId, vendorReply) => {
  const review = await db.ProductReview.findOne({
    where: { id: reviewId },
    include: [
      {
        model: db.Product,
        as: "product",
        where: { shop_id: shopId },
        required: true,
      }
    ]
  });

  if (!review) {
    throw new Error("Không tìm thấy đánh giá hoặc đánh giá không thuộc shop này");
  }

  review.vendor_reply = vendorReply;
  await review.save();
  return review;
};

const requestWithdrawal = async (shopId, withdrawData) => {
  const { amount, bank_name, account_number, account_name } = withdrawData;
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) throw new Error("Số tiền rút không hợp lệ");
  if (amt < 100000) throw new Error("Số tiền rút tối thiểu là 100.000 VNĐ");
  if (!bank_name || !account_number || !account_name) throw new Error("Thiếu thông tin ngân hàng");

  const pendingPayout = await db.ShopPayout.findOne({
    where: {
      shop_id: shopId,
      status: { [Op.in]: ["PENDING", "PENDING_APPROVAL", "PROCESSING"] }
    }
  });
  if (pendingPayout) {
    throw new Error("Bạn đang có một yêu cầu rút tiền khác đang chờ xử lý. Vui lòng đợi hoàn tất yêu cầu trước đó.");
  }

  const [wallet] = await db.ShopWallet.findOrCreate({
    where: { shop_id: shopId },
    defaults: { balance: 0, pending_balance: 0, total_earned: 0 }
  });

  const availableBalance = parseFloat(wallet.balance || 0);
  if (amt > availableBalance) {
    throw new Error("Số dư khả dụng không đủ để thực hiện giao dịch này");
  }

  const shop = await db.Shop.findByPk(shopId);
  if (!shop) throw new Error("Không tìm thấy Shop");

  let payout;
  const isAutoApprove = amt < 50000000;

  const transaction = await db.sequelize.transaction();
  try {
    // Luôn trừ số dư ví của shop khi tạo yêu cầu rút tiền
    await wallet.decrement('balance', { by: amt, transaction });

    if (isAutoApprove) {
      payout = await db.ShopPayout.create({
        shop_id: shopId,
        amount: amt,
        bank_name,
        bank_account: account_number,
        bank_account_name: account_name,
        status: "COMPLETED"
      }, { transaction });
    } else {
      payout = await db.ShopPayout.create({
        shop_id: shopId,
        amount: amt,
        bank_name,
        bank_account: account_number,
        bank_account_name: account_name,
        status: "PENDING_APPROVAL"
      }, { transaction });
    }

    await transaction.commit();

    try {
      if (shop.vendor_id) {
        await notificationService.createNotification(
          shop.vendor_id,
          isAutoApprove ? "Rút tiền thành công" : "Yêu cầu rút tiền đang chờ duyệt",
          isAutoApprove
            ? `Bạn đã rút thành công ${amt.toLocaleString()}₫ về tài khoản ngân hàng ${bank_name}.`
            : `Yêu cầu rút tiền trị giá ${amt.toLocaleString()}₫ về tài khoản ngân hàng ${bank_name} đã được tạo và đang chờ Admin phê duyệt.`,
          "PAYOUT_STATUS"
        );
      }
    } catch (notifErr) {
      console.error("Failed to create vendor notification:", notifErr);
    }

    try {
      await notificationService.createNotificationForRole(
        "admin",
        isAutoApprove ? "Yêu cầu rút tiền tự động thành công" : "Yêu cầu rút tiền mới cần phê duyệt",
        isAutoApprove
          ? `Gian hàng "${shop.shop_name}" vừa rút thành công số tiền ${amt.toLocaleString()}₫ về tài khoản ${bank_name}. Giao dịch đã được xử lý tự động.`
          : `Gian hàng "${shop.shop_name}" gửi yêu cầu rút số tiền lớn ${amt.toLocaleString()}₫. Vui lòng kiểm tra và phê duyệt.`,
        "PAYOUT_STATUS"
      );
      if (isAutoApprove) {
        await notificationService.createNotificationForRole(
          "manager",
          "Yêu cầu rút tiền tự động thành công",
          `Gian hàng "${shop.shop_name}" vừa rút thành công số tiền ${amt.toLocaleString()}₫ về tài khoản ${bank_name}. Giao dịch đã được xử lý tự động.`,
          "PAYOUT_STATUS"
        );
      }
    } catch (notifErr) {
      console.error("Failed to create admin/manager notification:", notifErr);
    }

    return payout;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getShopProducts = async (shopId, options = {}) => {
  const { page = 1, limit = 5 } = options;
  const offset = (page - 1) * limit;

  const { count, rows } = await db.Product.findAndCountAll({
    where: { shop_id: shopId },
    include: [
      {
        model: db.ProductImage,
        as: "images",
        required: false,
      },
      {
        model: db.ProductVariant,
        as: "variants",
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: parseInt(offset),
    distinct: true,
  });

  return {
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    products: rows,
  };
};

const getWithdrawals = async (shopId) => {
  return await db.ShopPayout.findAll({
    where: { shop_id: shopId },
    order: [["created_at", "DESC"]]
  });
};

const getAllShops = async (search = "", page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const where = { status: "APPROVED" };

  if (search) {
    where.shop_name = {
      [db.Sequelize.Op.like]: `%${search}%`,
    };
  }

  const { count, rows } = await db.Shop.findAndCountAll({
    where,
    attributes: [
      "id",
      "shop_name",
      ["shop_logo", "avatar_url"],
      "rating",
    ],
    order: [
      ["rating", "DESC"],
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  return {
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    shops: rows,
  };
};

export default {
  registerShop,
  getShopProfile,
  getShopByUserId,
  updateShop,
  getShopStatistics,
  getShopOrders,
  createShopProduct,
  updateShopProduct,
  deleteShopProduct,
  getShopProducts,
  getShopReviews,
  replyToReview,
  requestWithdrawal,
  getWithdrawals,
  getTopShops,
  getAllShops,
};
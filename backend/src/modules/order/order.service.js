import db from "../../database/models/index.js";
import cartService from "../cart/cart.service.js";
import notificationService from "../notification/notification.service.js";

const generateOrderCode = (prefix = "ORD") => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
};

const getDescendantCategories = async (categoryId) => {
  const descendants = [categoryId];
  let currentLevel = [categoryId];

  while (currentLevel.length > 0) {
    const children = await db.Category.findAll({
      where: { parent_id: { [db.Sequelize.Op.in]: currentLevel } },
      attributes: ['id']
    });
    
    if (children.length > 0) {
      const childIds = children.map(c => c.id);
      descendants.push(...childIds);
      currentLevel = childIds;
    } else {
      currentLevel = [];
    }
  }

  return descendants;
};

const calculateCheckout = async (userId, { items, platformCouponCode, shopCoupons, usePoints }) => {
  // Fetch loyalty points settings once
  const earnRateSetting = await db.SystemSetting.findOne({ where: { setting_key: 'LOYALTY_POINT_EARN_RATE' } });
  const redeemRateSetting = await db.SystemSetting.findOne({ where: { setting_key: 'LOYALTY_POINT_REDEEM_RATE' } });
  const earnRate = earnRateSetting ? Number(earnRateSetting.setting_value) : 10000;
  const redeemRate = redeemRateSetting ? Number(redeemRateSetting.setting_value) : 100;

  let isCartCheckout = false;
  let rawItems = [];

  if (items && items.length > 0) {
    rawItems = items;
  } else {
    isCartCheckout = true;
    const cartData = await cartService.getCartByUserId(userId);
    if (!cartData.items || cartData.items.length === 0) throw new Error("Giỏ hàng trống");
    rawItems = cartData.items;
  }

  // 1. Fetch details & group by Shop
  const shopsData = {};
  for (const item of rawItems) {
    const product = await db.Product.findByPk(item.product_id, {
      include: [{ model: db.Shop, as: "shop" }]
    });
    if (!product || product.approval_status !== "APPROVED") throw new Error(`Sản phẩm ${item.product_id} không hợp lệ`);

    let variant = null;
    let price = 0;

    if (item.product_variant_id || item.variant_id) {
      variant = await db.ProductVariant.findByPk(item.product_variant_id || item.variant_id);
      if (!variant || variant.product_id !== product.id) throw new Error("Biến thể không hợp lệ");
      price = variant.price;
    } else {
      variant = await db.ProductVariant.findOne({ where: { product_id: product.id } });
      if (!variant) throw new Error("Sản phẩm không có biến thể");
      price = variant.price;
    }

    const shopId = product.shop_id;
    if (!shopsData[shopId]) {
      shopsData[shopId] = {
        shop_id: shopId,
        shop_name: product.shop.shop_name,
        items: [],
        subtotal: 0,
        shipping_fee: 30000, // Fixed logic for now
        shop_discount: 0,
        shop_coupon_id: null,
      };
    }

    const itemTotal = item.quantity * Number(price);
    shopsData[shopId].subtotal += itemTotal;
    shopsData[shopId].items.push({
      cart_item_id: item.id || item.cart_item_id,
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      quantity: item.quantity,
      unit_price: Number(price),
      total_price: itemTotal,
      category_id: product.category_id
    });
  }

  // 2. Apply Shop Coupons
  if (shopCoupons && Object.keys(shopCoupons).length > 0) {
    for (const [shopId, code] of Object.entries(shopCoupons)) {
      if (shopsData[shopId]) {
        const coupon = await db.Coupon.findOne({ where: { code, shop_id: shopId } });
        if (coupon) {
          if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            throw new Error(`Mã giảm giá ${code} đã hết lượt sử dụng`);
          }
          
          // Kiểm tra xem user đã lưu mã này chưa (trừ khi dùng guest/không bắt buộc)
          const isSaved = await db.UserCoupon.findOne({
            where: { user_id: userId, coupon_id: coupon.id, is_used: false }
          });
          if (!isSaved) {
            throw new Error(`Bạn chưa lưu mã giảm giá ${code}. Vui lòng lưu mã trước khi sử dụng.`);
          }

          let validShopSubtotal = shopsData[shopId].subtotal;

          // Nếu có giới hạn danh mục
          if (coupon.category_id) {
            validShopSubtotal = 0;
            const validCategoryIds = await getDescendantCategories(coupon.category_id);
            for (const item of shopsData[shopId].items) {
              if (validCategoryIds.includes(item.category_id)) {
                validShopSubtotal += item.total_price;
              }
            }
          }

          if (validShopSubtotal >= coupon.min_order_amount) {
            const discount = coupon.discount_type === 'PERCENT'
              ? (validShopSubtotal * Number(coupon.discount_value) / 100)
              : Number(coupon.discount_value);
            shopsData[shopId].shop_discount = coupon.max_discount ? Math.min(discount, Number(coupon.max_discount)) : discount;
            shopsData[shopId].shop_coupon_id = coupon.id;
          } else if (coupon.category_id && validShopSubtotal === 0) {
            throw new Error(`Mã giảm giá ${code} không áp dụng cho danh mục sản phẩm bạn đang mua từ shop này`);
          } else {
            throw new Error(`Đơn hàng từ shop chưa đạt mức tối thiểu ${coupon.min_order_amount}₫ để áp dụng mã giảm giá ${code}`);
          }
        }
      }
    }
  }

  // 3. Calculate Parent totals
  let parentSubtotal = 0;
  let totalShippingFee = 0;
  let totalShopDiscount = 0;

  for (const shop of Object.values(shopsData)) {
    shop.final_amount = shop.subtotal + shop.shipping_fee - shop.shop_discount;
    parentSubtotal += shop.subtotal;
    totalShippingFee += shop.shipping_fee;
    totalShopDiscount += shop.shop_discount;
  }

  // 4. Apply Platform Coupon
  let platformDiscount = 0;
  let platformCouponObj = null;
  if (platformCouponCode) {
    platformCouponObj = await db.Coupon.findOne({ where: { code: platformCouponCode, shop_id: null } });
    if (platformCouponObj) {
      if (platformCouponObj.usage_limit && platformCouponObj.used_count >= platformCouponObj.usage_limit) {
        throw new Error(`Mã giảm giá sàn ${platformCouponCode} đã hết lượt sử dụng`);
      }

      const isSaved = await db.UserCoupon.findOne({
        where: { user_id: userId, coupon_id: platformCouponObj.id, is_used: false }
      });
      if (!isSaved) {
        throw new Error(`Bạn chưa lưu mã giảm giá sàn ${platformCouponCode}. Vui lòng lưu mã trước khi sử dụng.`);
      }

      let validSubtotal = parentSubtotal;

      // Nếu có giới hạn danh mục
      if (platformCouponObj.category_id) {
        validSubtotal = 0;
        const validCategoryIds = await getDescendantCategories(platformCouponObj.category_id);
        for (const shop of Object.values(shopsData)) {
          for (const item of shop.items) {
            if (validCategoryIds.includes(item.category_id)) {
              validSubtotal += item.total_price;
            }
          }
        }
      }

      if (validSubtotal >= platformCouponObj.min_order_amount) {
        const discount = platformCouponObj.discount_type === 'PERCENT'
          ? (validSubtotal * Number(platformCouponObj.discount_value) / 100)
          : Number(platformCouponObj.discount_value);
        platformDiscount = platformCouponObj.max_discount ? Math.min(discount, Number(platformCouponObj.max_discount)) : discount;
      } else if (platformCouponObj.category_id && validSubtotal === 0) {
        throw new Error("Mã giảm giá sàn không áp dụng cho danh mục sản phẩm bạn đang mua");
      } else {
        throw new Error(`Đơn hàng chưa đạt mức tối thiểu ${platformCouponObj.min_order_amount}₫ để áp dụng mã giảm giá này`);
      }
    }
  }

  // 5. Apply Points
  let pointsDiscount = 0;
  if (usePoints) {
    const user = await db.User.findByPk(userId);
    if (user && user.loyalty_points > 0) {
      pointsDiscount = user.loyalty_points * redeemRate; // Dynamically calculated
      // Ensure points don't exceed the total order amount
      const remainingTotal = parentSubtotal + totalShippingFee - totalShopDiscount - platformDiscount;
      if (pointsDiscount > remainingTotal) {
        pointsDiscount = remainingTotal;
      }
    }
  }

  const finalTotalAmount = parentSubtotal + totalShippingFee - totalShopDiscount - platformDiscount - pointsDiscount;

  // Check if user is blocked from COD payment (bom hàng >= 3 lần trong 1 tháng)
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const bomCount = await db.ShopOrderStatusHistory.count({
    where: {
      note: {
        [db.Sequelize.Op.like]: "BOM:%"
      },
      changed_at: {
        [db.Sequelize.Op.gte]: oneMonthAgo
      }
    },
    include: [{
      model: db.ShopOrder,
      as: "shopOrder",
      required: true,
      include: [{
        model: db.ParentOrder,
        as: "parentOrder",
        required: true,
        where: { user_id: userId }
      }]
    }]
  });
  const isCodBlocked = bomCount >= 3;

  return {
    shops: Object.values(shopsData),
    parentSubtotal,
    totalShippingFee,
    totalShopDiscount,
    platformDiscount,
    pointsDiscount,
    platformCoupon: platformCouponObj ? { id: platformCouponObj.id, code: platformCouponObj.code } : null,
    totalAmount: finalTotalAmount > 0 ? finalTotalAmount : 0,
    isCartCheckout,
    earnRate,
    redeemRate,
    isCodBlocked
  };
};

const createOrder = async (userId, data) => {
  const { paymentMethod = "COD", addressId, platformCouponCode, shopCoupons, items, usePoints, note } = data;

  const calcResult = await calculateCheckout(userId, { items, platformCouponCode, shopCoupons, usePoints });
  
  if (paymentMethod === "COD" && calcResult.isCodBlocked) {
    throw new Error("Tính năng thanh toán COD của bạn đã bị khóa tạm thời do từ chối nhận hàng (bom hàng) quá 3 lần trong vòng 30 ngày qua. Vui lòng thanh toán trực tuyến.");
  }

  const address = await db.UserAddress.findByPk(addressId);
  if (!address) throw new Error("Địa chỉ không hợp lệ");

  const shippingAddressStr = `${address.receiver_name}, ${address.phone}, ${address.street || ''}, ${address.ward}, ${address.district}, ${address.province}`;

  const transaction = await db.sequelize.transaction();
  try {
    // 1. Create Parent Order
    const parentOrder = await db.ParentOrder.create({
      user_id: userId,
      address_id: addressId,
      checkout_code: generateOrderCode("CHK"),
      total_amount: calcResult.totalAmount,
      payment_method: paymentMethod,
      payment_status: "UNPAID",
      shipping_address: shippingAddressStr,
      platform_coupon_id: calcResult.platformCoupon?.id || null,
      note: note || null,
    }, { transaction });

    // Calculate total points to be distributed
    const totalPointsToUse = calcResult.pointsDiscount > 0 ? Math.ceil(calcResult.pointsDiscount / calcResult.redeemRate) : 0;
    let pointsUsedRemaining = totalPointsToUse;

    // Deduct total used points from user immediately (since they are spending it now)
    if (totalPointsToUse > 0) {
      await db.User.decrement('loyalty_points', { by: totalPointsToUse, where: { id: userId }, transaction });
    }

    const totalGlobalDiscount = (calcResult.platformDiscount || 0) + (calcResult.pointsDiscount || 0);
    let remainingGlobalDiscount = totalGlobalDiscount;
    const totalOriginalFinalAmount = calcResult.shops.reduce((sum, s) => sum + s.final_amount, 0);

    // 2. Create Shop Orders
    for (let i = 0; i < calcResult.shops.length; i++) {
      const shop = calcResult.shops[i];
      // Get commission rate
      const platformComm = await db.PlatformCommission.findOne({ where: { shop_id: shop.shop_id } });
      const commissionRate = platformComm ? Number(platformComm.commission_rate) : 10.0;
      // Chiết khấu/hoa hồng chỉ tính trên tiền sản phẩm sau khi trừ giảm giá của shop (không tính trên phí vận chuyển)
      const commissionBase = Math.max(0, shop.subtotal - shop.shop_discount);
      const commissionAmount = (commissionBase * commissionRate) / 100;

      // Distribute points_used (assign to first shop, or distribute proportionally)
      let shopPointsUsed = 0;
      if (pointsUsedRemaining > 0) {
        if (i === calcResult.shops.length - 1) {
          shopPointsUsed = pointsUsedRemaining;
        } else {
          shopPointsUsed = Math.floor(totalPointsToUse * (shop.final_amount / totalOriginalFinalAmount));
          pointsUsedRemaining -= shopPointsUsed;
        }
      }

      // Calculate earned points for THIS shop order
      const shopPointsEarned = Math.floor(shop.final_amount / calcResult.earnRate);

      // Distribute global discount (platform + points) proportionally to shop.final_amount
      let shopGlobalDiscount = 0;
      if (remainingGlobalDiscount > 0) {
        if (i === calcResult.shops.length - 1) {
          shopGlobalDiscount = remainingGlobalDiscount;
        } else {
          shopGlobalDiscount = Math.floor(totalGlobalDiscount * (shop.final_amount / totalOriginalFinalAmount));
          remainingGlobalDiscount -= shopGlobalDiscount;
        }
      }

      const finalAmountAfterGlobalDiscount = Math.max(0, shop.final_amount - shopGlobalDiscount);

      const shopOrder = await db.ShopOrder.create({
        parent_order_id: parentOrder.id,
        shop_id: shop.shop_id,
        shop_order_code: generateOrderCode("SHOP"),
        subtotal: shop.subtotal,
        shipping_fee: shop.shipping_fee,
        discount_amount: shop.shop_discount,
        final_amount: finalAmountAfterGlobalDiscount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        shop_coupon_id: shop.shop_coupon_id,
        points_used: shopPointsUsed,
        points_earned: shopPointsEarned,
        status: "PENDING",
      }, { transaction });

      // Create Order Items
      const orderItems = shop.items.map(item => ({
        shop_order_id: shopOrder.id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        sku: item.sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));
      await db.OrderItem.bulkCreate(orderItems, { transaction });

      // Status History
      await db.ShopOrderStatusHistory.create({
        shop_order_id: shopOrder.id,
        new_status: "PENDING",
        note: "Đơn hàng mới được tạo",
      }, { transaction });

      // Gửi thông báo cho Vendor
      const shopObj = await db.Shop.findByPk(shop.shop_id, { transaction });
      if (shopObj && shopObj.vendor_id) {
        try {
          await notificationService.createNotification(
            shopObj.vendor_id,
            "Đơn hàng mới chờ xử lý",
            `Gian hàng của bạn nhận được đơn hàng mới mã ${shopOrder.shop_order_code} trị giá ${Number(shopOrder.final_amount).toLocaleString()}₫.`,
            "NEW_ORDER"
          );
        } catch (notifErr) {
          console.error("Failed to create vendor order notification:", notifErr);
        }
      }

      // Deduct stock
      for (const item of shop.items) {
        await db.ProductVariant.decrement("stock_quantity", {
          by: item.quantity,
          where: { id: item.variant_id },
          transaction,
        });
      }
    }

    if (data.is_cart_checkout) {
      // Vì hiện tại frontend hỗ trợ thanh toán từng phần giỏ hàng, nên ta chỉ xóa các item đã được chọn
      const cartItemIds = calcResult.shops.flatMap(s => s.items.map(i => i.cart_item_id).filter(Boolean));
      if (cartItemIds.length > 0) {
        await db.CartItem.destroy({ where: { id: cartItemIds, user_id: userId }, transaction });
      }
    }

    // Tạo PaymentLog ban đầu
    await db.PaymentLog.create({
      order_code: parentOrder.checkout_code,
      gateway_name: paymentMethod,
      amount: parentOrder.total_amount,
      status: "UNPAID",
      message: paymentMethod === "COD" ? "Khởi tạo đơn hàng thanh toán khi nhận hàng" : "Đang chờ thanh toán trực tuyến",
    }, { transaction });

    // Tăng số lần sử dụng cho các mã khuyến mãi (Sàn & Shop)
    const appliedCouponIds = [];
    if (calcResult.platformCoupon && calcResult.platformCoupon.id) {
      appliedCouponIds.push(calcResult.platformCoupon.id);
    }
    calcResult.shops.forEach(shop => {
      if (shop.shop_coupon_id) {
        appliedCouponIds.push(shop.shop_coupon_id);
      }
    });

    if (appliedCouponIds.length > 0) {
      await db.Coupon.increment("used_count", {
        by: 1,
        where: { id: { [db.Sequelize.Op.in]: appliedCouponIds } },
        transaction
      });

      // Đánh dấu mã đã sử dụng trong UserCoupon
      await db.UserCoupon.update(
        { is_used: true, used_at: new Date() },
        { 
          where: { 
            user_id: userId, 
            coupon_id: { [db.Sequelize.Op.in]: appliedCouponIds },
            is_used: false
          },
          transaction
        }
      );
    }

    await transaction.commit();

    // Gửi thông báo cho User (người mua) đặt hàng thành công
    try {
      await notificationService.createNotification(
        userId,
        "Đặt hàng thành công",
        `Bạn đã đặt thành công đơn hàng checkout ${parentOrder.checkout_code} trị giá ${Number(parentOrder.total_amount).toLocaleString()}₫. Vui lòng chờ shop xác nhận.`,
        "NEW_ORDER"
      );
    } catch (notifErr) {
      console.error("Failed to create user order notification:", notifErr);
    }

    return parentOrder;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

  const getUserOrders = async (userId, { page = 1, limit = 10, status }) => {
    const where = {};
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        where.status = status.split(',');
      } else {
        where.status = status;
      }
    }

  // Find ParentOrders first
  const parentOrders = await db.ParentOrder.findAll({
    where: { user_id: userId },
    attributes: ['id']
  });
  const parentIds = parentOrders.map(p => p.id);

  if (parentIds.length > 0) {
    where.parent_order_id = { [db.Sequelize.Op.in]: parentIds };
  } else {
    return { total: 0, totalPages: 0, currentPage: parseInt(page), orders: [] };
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await db.ShopOrder.findAndCountAll({
    where,
    include: [
      {
        model: db.OrderItem,
        as: "items",
        include: [
          {
            model: db.ProductVariant,
            as: "variant",
            paranoid: false,
            include: [
              {
                model: db.Product,
                as: "product",
                paranoid: false,
                include: [{ model: db.ProductImage, as: "images" }]
              }
            ]
          }
        ]
      },
      { model: db.Shop, as: "shop", paranoid: false },
      { model: db.ParentOrder, as: "parentOrder", paranoid: false }
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  for (let shopOrder of rows) {
    if (
      shopOrder.parentOrder?.payment_method === "VNPAY" &&
      shopOrder.parentOrder?.payment_status === "UNPAID" &&
      shopOrder.status !== "CANCELLED"
    ) {
      const hoursDiff = (new Date() - new Date(shopOrder.created_at)) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        await shopOrder.update({ status: "CANCELLED" });
        shopOrder.status = "CANCELLED";
        // Hoàn điểm nếu có sử dụng
        if (shopOrder.points_used && shopOrder.points_used > 0) {
          await db.User.increment('loyalty_points', { by: shopOrder.points_used, where: { id: shopOrder.parentOrder.user_id } });
        }
        // Hoàn kho
        const orderItems = await db.OrderItem.findAll({ where: { shop_order_id: shopOrder.id } });
        for (const item of orderItems) {
          if (item.variant_id) {
            await db.ProductVariant.increment("stock_quantity", { by: item.quantity, where: { id: item.variant_id }, paranoid: false });
          }
        }
      }
    }
  }

  return {
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    orders: rows,
  };
};

const getUserOrderCounts = async (userId) => {
  const counts = await db.ShopOrder.findAll({
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('ShopOrder.id')), 'count']
    ],
    include: [{
      model: db.ParentOrder,
      as: "parentOrder",
      where: { user_id: userId },
      attributes: [],
      paranoid: false,
    }],
    group: ['status'],
    raw: true,
  });

  const countMap = {
    ALL: 0,
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    READY_FOR_PICKUP: 0,
    SHIPPING: 0,
    DELIVERING: 0,
    DELIVERED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    RETURN_PENDING: 0,
    RETURNED: 0,
    RETURNS: 0,
  };

  const deliveringStatuses = ["READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "DELIVERING", "SHIPPING", "DELIVERED"];

  counts.forEach(c => {
    if (deliveringStatuses.includes(c.status)) {
      countMap.DELIVERING += Number(c.count);
      countMap.ALL += Number(c.count);
      if (countMap[c.status] !== undefined) {
        countMap[c.status] += Number(c.count);
      }
    } else if (countMap[c.status] !== undefined) {
      countMap[c.status] += Number(c.count);
      countMap.ALL += Number(c.count);
    }
  });

  // RETURNS includes RETURN_PENDING and RETURNED
  countMap.RETURNS = countMap.RETURN_PENDING + countMap.RETURNED;

  return countMap;
};

const autoAssignShipperByArea = async (shopOrderId) => {
  try {
    const shopOrder = await db.ShopOrder.findByPk(shopOrderId, {
      include: [{ model: db.ParentOrder, as: "parentOrder" }]
    });
    if (!shopOrder) return null;

    const address = shopOrder.parentOrder?.shipping_address || "";
    const shopId = shopOrder.shop_id;

    // Fetch active shippers
    const activeShippers = await db.User.findAll({
      where: { status: "ACTIVE" },
      include: [
        {
          model: db.Role,
          as: "role",
          where: { role_name: "shipper" }
        },
        {
          model: db.UserProfile,
          as: "profile"
        }
      ]
    });

    // All active shippers are eligible since they are platform-wide
    const eligibleShippers = activeShippers;

    if (eligibleShippers.length === 0) {
      console.log(`[AutoAssign] No eligible active shippers found for ShopOrder ${shopOrderId}`);
      return null;
    }

    // Get active workloads for eligible shippers
    const shipperIds = eligibleShippers.map(s => s.id);
    const activeOrders = await db.ShopOrder.findAll({
      where: {
        shipper_id: { [db.Sequelize.Op.in]: shipperIds },
        status: ["SHIPPING", "RETURN_PENDING"]
      },
      include: [{ model: db.ParentOrder, as: "parentOrder" }]
    });

    const cleanAddress = address.toLowerCase();
    const candidates = eligibleShippers.map(shipper => {
      let matchedAreas = [];
      try {
        const rawAreas = shipper.profile?.operating_areas;
        if (Array.isArray(rawAreas)) {
          matchedAreas = rawAreas;
        } else if (typeof rawAreas === "string") {
          matchedAreas = JSON.parse(rawAreas);
        }
      } catch (e) {
        console.error(`Error parsing operating_areas for user ${shipper.id}:`, e);
      }

      if (!Array.isArray(matchedAreas)) {
        matchedAreas = [];
      }

      // Find which registered areas are present in the shipping address
      const matched = matchedAreas.filter(area => area && cleanAddress.includes(area.toLowerCase().trim()));
      const hasAreaMatch = matched.length > 0;

      // Compute total workload (active orders assigned to this shipper)
      const shipperActiveOrders = activeOrders.filter(o => Number(o.shipper_id) === Number(shipper.id));
      const totalWorkload = shipperActiveOrders.length;

      // Compute same area workload (active orders in the same matched operating areas)
      let sameAreaActiveCount = 0;
      if (hasAreaMatch) {
        sameAreaActiveCount = shipperActiveOrders.filter(o => {
          const oAddr = (o.parentOrder?.shipping_address || "").toLowerCase();
          return matched.some(area => oAddr.includes(area.toLowerCase().trim()));
        }).length;
      }

      return {
        shipperId: shipper.id,
        hasAreaMatch,
        totalWorkload,
        sameAreaActiveCount
      };
    });

    const matchedCandidates = candidates.filter(c => c.hasAreaMatch);
    let selectedCandidate = null;

    if (matchedCandidates.length > 0) {
      matchedCandidates.sort((a, b) => {
        if (b.sameAreaActiveCount !== a.sameAreaActiveCount) {
          return b.sameAreaActiveCount - a.sameAreaActiveCount;
        }
        return a.totalWorkload - b.totalWorkload;
      });
      selectedCandidate = matchedCandidates[0];
      console.log(`[AutoAssign] Found area-matched shipper ${selectedCandidate.shipperId} for ShopOrder ${shopOrderId} (sameAreaActive: ${selectedCandidate.sameAreaActiveCount}, totalWorkload: ${selectedCandidate.totalWorkload})`);
    } else {
      candidates.sort((a, b) => a.totalWorkload - b.totalWorkload);
      selectedCandidate = candidates[0];
      console.log(`[AutoAssign] No area match for ShopOrder ${shopOrderId}. Falling back to least busy shipper ${selectedCandidate.shipperId} (totalWorkload: ${selectedCandidate.totalWorkload})`);
    }

    return selectedCandidate ? selectedCandidate.shipperId : null;
  } catch (error) {
    console.error(`[AutoAssign] Error in autoAssignShipperByArea for ShopOrder ${shopOrderId}:`, error);
    return null;
  }
};



const updateOrderStatus = async (shopOrderId, userId, newStatus, role, note = null) => {
  const shopOrder = await db.ShopOrder.findByPk(shopOrderId, {
    include: [{ model: db.ParentOrder, as: "parentOrder" }, { model: db.OrderItem, as: "items" }]
  });
  if (!shopOrder) throw new Error("Không tìm thấy đơn hàng");

  if (role === "vendor") {
    const userShop = await db.Shop.findOne({ where: { vendor_id: userId } });
    if (!userShop || userShop.id !== shopOrder.shop_id) {
      throw new Error("Không có quyền cập nhật đơn hàng này");
    }
    if (newStatus === "PREPARING" && shopOrder.parentOrder?.payment_method === "VNPAY" && shopOrder.parentOrder?.payment_status === "UNPAID") {
      throw new Error("Đơn hàng chưa thanh toán VNPay không thể chuyển sang Đang chuẩn bị");
    }
  } else if (role === "user") {
    if (shopOrder.parentOrder.user_id !== userId) {
      throw new Error("Không có quyền cập nhật đơn hàng này");
    }
  } else if (role === "shipper") {
    throw new Error("Shipper phải sử dụng tính năng cập nhật Vận đơn");
  }

  const oldStatus = shopOrder.status;
  const updateData = { status: newStatus };

  // Trigger auto-assignment of shipper and create shipment when transitioning to PREPARING status
  if (newStatus === "PREPARING" && oldStatus !== "PREPARING") {
    const assignedShipperId = await autoAssignShipperByArea(shopOrderId);
    if (assignedShipperId) {
      updateData.shipper_id = assignedShipperId;
    }
    const shipmentService = (await import("./shipmentService.js")).default;
    await shipmentService.createShipment(shopOrderId, assignedShipperId || null);
  }

  // Handle DELIVERED logic
  if (newStatus === "DELIVERED" && oldStatus !== "DELIVERED") {
    updateData.delivered_at = new Date();
    
    if (shopOrder.parentOrder.payment_method === "COD") {
      updateData.cod_amount_collected = shopOrder.final_amount;
      updateData.cod_status = "HELD_BY_SHIPPER";
      await shopOrder.parentOrder.update({ payment_status: "PAID" });
    }

    const settings = await db.SystemSetting.findAll({
      where: { setting_key: ['tax_rate', 'payment_gateway_fee'] }
    });
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);
    const taxRate = parseFloat(settingsMap.tax_rate || "1.50");
    const gatewayFeeRate = parseFloat(settingsMap.payment_gateway_fee || "5.00");

    const baseAmount = Math.max(0, Number(shopOrder.subtotal) - Number(shopOrder.discount_amount));
    const taxAmount = baseAmount * (taxRate / 100);
    
    let gatewayFeeAmount = 0;
    if (shopOrder.parentOrder.payment_method !== "COD") {
      gatewayFeeAmount = Number(shopOrder.final_amount) * (gatewayFeeRate / 100);
    }

    // Update ShopWallet: add to pending_balance
    const netEarning = baseAmount - Number(shopOrder.commission_amount) - taxAmount - gatewayFeeAmount;
    const [wallet] = await db.ShopWallet.findOrCreate({
      where: { shop_id: shopOrder.shop_id },
      defaults: { balance: 0.00, pending_balance: 0.00, total_earned: 0.00 }
    });
    await wallet.increment('pending_balance', { by: netEarning });
  }

  // Handle COMPLETED logic
  if (newStatus === "COMPLETED" && oldStatus !== "COMPLETED") {
    const settings = await db.SystemSetting.findAll({
      where: { setting_key: ['tax_rate', 'payment_gateway_fee'] }
    });
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);
    const taxRate = parseFloat(settingsMap.tax_rate || "1.50");
    const gatewayFeeRate = parseFloat(settingsMap.payment_gateway_fee || "5.00");

    const baseAmount = Math.max(0, Number(shopOrder.subtotal) - Number(shopOrder.discount_amount));
    const taxAmount = baseAmount * (taxRate / 100);
    
    let gatewayFeeAmount = 0;
    if (shopOrder.parentOrder.payment_method !== "COD") {
      gatewayFeeAmount = Number(shopOrder.final_amount) * (gatewayFeeRate / 100);
    }

    const netEarning = baseAmount - Number(shopOrder.commission_amount) - taxAmount - gatewayFeeAmount;
    const [wallet] = await db.ShopWallet.findOrCreate({
      where: { shop_id: shopOrder.shop_id },
      defaults: { balance: 0.00, pending_balance: 0.00, total_earned: 0.00 }
    });

    const deductAmount = Math.min(Number(wallet.pending_balance), netEarning);
    await wallet.update({
      pending_balance: Number(wallet.pending_balance) - deductAmount,
      balance: Number(wallet.balance) + netEarning,
      total_earned: Number(wallet.total_earned) + netEarning
    });

    if (shopOrder.parentOrder?.payment_method === "COD" && shopOrder.parentOrder?.payment_status !== "PAID") {
      await shopOrder.parentOrder.update({ payment_status: "PAID" });
    }

    // Add loyalty points when order is officially completed
    if (shopOrder.points_earned && shopOrder.points_earned > 0) {
      await db.User.increment('loyalty_points', { by: shopOrder.points_earned, where: { id: shopOrder.parentOrder.user_id } });
    }
  }

  await shopOrder.update(updateData);

  // Refund points when cancelled or failed
  const isCancelledOrFailed = (newStatus === "CANCELLED" || newStatus === "FAILED");
  const wasCancelledOrFailed = ["CANCELLED", "FAILED"].includes(oldStatus);
  if (isCancelledOrFailed && !wasCancelledOrFailed) {
    if (shopOrder.points_used && shopOrder.points_used > 0) {
      await db.User.increment('loyalty_points', { by: shopOrder.points_used, where: { id: shopOrder.parentOrder.user_id } });
    }
    
    // CASH REFUND FOR CANCELLED (Convert to loyalty points)
    if (newStatus === "CANCELLED" && shopOrder.parentOrder && shopOrder.parentOrder.payment_method !== "COD") {
      if (shopOrder.parentOrder.payment_status !== "REFUNDED") {
        const redeemRateSetting = await db.SystemSetting.findOne({ where: { setting_key: 'LOYALTY_POINT_REDEEM_RATE' } });
        const redeemRate = redeemRateSetting ? Number(redeemRateSetting.setting_value) : 100;
        const refundAmount = Number(shopOrder.final_amount);
        const pointsToRefund = Math.floor(refundAmount / redeemRate);
        if (pointsToRefund > 0) {
          await db.User.increment('loyalty_points', { by: pointsToRefund, where: { id: shopOrder.parentOrder.user_id } });
        }
        await db.ParentOrder.update({ payment_status: "REFUNDED" }, { where: { id: shopOrder.parent_order_id } });
      }
    }
  }

  // Restore stock when cancelled or returned to vendor
  const isRestored = (newStatus === "CANCELLED" || newStatus === "RETURNED");
  const wasRestored = ["CANCELLED", "RETURNED"].includes(oldStatus);
  if (isRestored && !wasRestored) {
    let shouldRestockAll = true;
    let returnRequest = null;
    let returnService = null;

    if (newStatus === "RETURNED") {
      try {
        returnService = (await import("./returnService.js")).default;
        returnRequest = await db.ReturnRequest.findOne({
          where: { shop_order_id: shopOrderId, status: ["APPROVED_BY_SHOP", "RESOLVED_BY_ADMIN"] },
          include: [
            { model: db.ShopOrder, as: "shopOrder" },
            { model: db.ReturnItem, as: "items", include: [{ model: db.OrderItem, as: "orderItem" }]}
          ]
        });

        if (returnRequest) {
          shouldRestockAll = false; // We have specific return items to restock
          await returnService._processRestockOnly(returnRequest, null);
          
          // Process the refund (update shop wallet and user loyalty points)
          await returnService._processRefundOnly(returnRequest, null);
          
          // Đánh dấu yêu cầu trả hàng đã hoàn tất
          await returnRequest.update({ status: "COMPLETED" });
          
          // Đánh dấu parentOrder là đã hoàn tiền (Refunded)
          await db.ParentOrder.update({ payment_status: "REFUNDED" }, { where: { id: shopOrder.parent_order_id } });
        } else {
          // Không có returnRequest -> Khách từ chối nhận hàng ở cửa
          if (shopOrder.parentOrder && shopOrder.parentOrder.payment_method !== "COD") {
            const isBom = Number(shopOrder.shipping_fee) > 0;
            let refundAmount = Number(shopOrder.final_amount);
            let refundMsg = "";
            if (isBom) {
              const fee = Number(shopOrder.shipping_fee || 0);
              refundAmount = Math.max(0, refundAmount - fee);
              refundMsg = `BOM: Hoàn tiền ${refundAmount}đ (trừ ${fee}đ phí ship)`;
            } else {
              refundMsg = `Hoàn đủ tiền ${refundAmount}đ (không BOM)`;
            }
            
            if (shopOrder.parentOrder.payment_status !== "REFUNDED") {
              const redeemRateSetting = await db.SystemSetting.findOne({ where: { setting_key: 'LOYALTY_POINT_REDEEM_RATE' } });
              const redeemRate = redeemRateSetting ? Number(redeemRateSetting.setting_value) : 100;
              const pointsToRefund = Math.floor(refundAmount / redeemRate);
              if (pointsToRefund > 0) {
                await db.User.increment('loyalty_points', { by: pointsToRefund, where: { id: shopOrder.parentOrder.user_id } });
              }
              await db.ParentOrder.update({ payment_status: "REFUNDED" }, { where: { id: shopOrder.parent_order_id } });
            }
            // Add to note if possible
            note = note ? `${note} - ${refundMsg}` : refundMsg;
          }
        }
      } catch (err) {
        console.error("Lỗi khi xử lý trả hàng/hoàn tiền:", err);
      }
    }

    if (shouldRestockAll) {
      const orderItems = await db.OrderItem.findAll({ where: { shop_order_id: shopOrderId } });
      for (const item of orderItems) {
        if (item.variant_id) {
          await db.ProductVariant.increment("stock_quantity", {
            by: item.quantity,
            where: { id: item.variant_id },
            paranoid: false,
          });
        }
      }
    }
  }

  await db.ShopOrderStatusHistory.create({
    shop_order_id: shopOrderId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: userId || null,
    note: note,
  });

  // Tạo thông báo khi cập nhật trạng thái đơn hàng
  try {
    const shopObj = await db.Shop.findByPk(shopOrder.shop_id);
    const vendorId = shopObj?.vendor_id;
    const customerId = shopOrder.parentOrder?.user_id;

    // 1. Thông báo cho người thực hiện (userId)
    let actorTitle = "Cập nhật đơn hàng";
    let actorContent = `Bạn đã cập nhật đơn hàng ${shopOrder.shop_order_code} sang trạng thái ${newStatus}.`;
    if (userId === vendorId) {
      if (newStatus === "CONFIRMED") {
        actorTitle = "Xác nhận đơn hàng";
        actorContent = `Bạn đã xác nhận đơn hàng ${shopOrder.shop_order_code}.`;
      } else if (newStatus === "PREPARING") {
        actorTitle = "Chuẩn bị hàng";
        actorContent = `Bạn đã chuyển trạng thái chuẩn bị hàng cho đơn ${shopOrder.shop_order_code}.`;
      } else if (newStatus === "RETURNED") {
        actorTitle = "Nhận hàng hoàn thành công";
        actorContent = `Bạn đã xác nhận nhận lại hàng hoàn cho đơn hàng ${shopOrder.shop_order_code}.`;
      }
    } else if (userId === customerId) {
      if (newStatus === "DELIVERED") {
        actorTitle = "Xác nhận nhận hàng";
        actorContent = `Bạn đã xác nhận đã nhận được đơn hàng ${shopOrder.shop_order_code}.`;
      } else if (newStatus === "CANCELLED") {
        actorTitle = "Hủy đơn hàng";
        actorContent = `Bạn đã hủy đơn hàng ${shopOrder.shop_order_code}.`;
      }
    } else if (shopOrder.shipper_id === userId) {
      if (newStatus === "SHIPPING") {
        actorTitle = "Bắt đầu giao hàng";
        actorContent = `Đơn hàng ${shopOrder.shop_order_code} đã được cập nhật sang trạng thái Đang giao.`;
      } else if (newStatus === "DELIVERED") {
        actorTitle = "Giao hàng thành công";
        actorContent = `Bạn đã giao thành công đơn hàng ${shopOrder.shop_order_code}.`;
      } else if (newStatus === "FAILED") {
        actorTitle = "Giao hàng thất bại";
        actorContent = `Bạn đã cập nhật giao đơn hàng ${shopOrder.shop_order_code} thất bại. Lý do: ${note || "Không có lý do"}.`;
      } else if (newStatus === "RETURN_PENDING") {
        actorTitle = "Bắt đầu chuyển hoàn";
        actorContent = `Bạn đã bắt đầu chuyển hoàn đơn hàng ${shopOrder.shop_order_code} về cho cửa hàng.`;
      }
    }
    await notificationService.createNotification(userId, actorTitle, actorContent, "ORDER_UPDATE");

    // 2. Thông báo cho các bên liên quan (nếu người thực hiện không phải là họ)
    if (vendorId && userId !== vendorId) {
      let vendorTitle = "Cập nhật đơn hàng";
      let vendorContent = `Đơn hàng ${shopOrder.shop_order_code} của shop đã được cập nhật sang trạng thái ${newStatus}.`;
      if (newStatus === "SHIPPING") {
        vendorTitle = "Đơn hàng đang giao";
        vendorContent = `Shipper đang giao đơn hàng ${shopOrder.shop_order_code}.`;
      } else if (newStatus === "PICKED_UP") {
        vendorTitle = "Shipper đã lấy hàng";
        vendorContent = `Shipper đã lấy hàng thành công cho đơn hàng ${shopOrder.shop_order_code}.`;
      } else if (newStatus === "IN_TRANSIT") {
        vendorTitle = "Đơn hàng đang luân chuyển";
        vendorContent = `Đơn hàng ${shopOrder.shop_order_code} đang được luân chuyển.`;
      } else if (newStatus === "DELIVERED") {
        vendorTitle = "Đơn hàng đã giao thành công";
        vendorContent = `Khách hàng/Shipper đã xác nhận giao thành công đơn hàng ${shopOrder.shop_order_code}.`;
      } else if (newStatus === "FAILED") {
        vendorTitle = "Giao hàng thất bại";
        vendorContent = `Shipper xác nhận giao đơn hàng ${shopOrder.shop_order_code} thất bại. Lý do: ${note || "Không có lý do"}.`;
      } else if (newStatus === "RETURN_PENDING") {
        vendorTitle = "Đơn hàng chuyển hoàn";
        vendorContent = `Đơn hàng ${shopOrder.shop_order_code} đang được chuyển hoàn về shop của bạn.`;
      } else if (newStatus === "CANCELLED") {
        vendorTitle = "Đơn hàng bị hủy";
        vendorContent = `Khách hàng đã hủy đơn hàng ${shopOrder.shop_order_code}.`;
      }
      await notificationService.createNotification(vendorId, vendorTitle, vendorContent, "ORDER_UPDATE");
    }

    if (customerId && userId !== customerId) {
      let customerTitle = "Trạng thái đơn hàng";
      let customerContent = `Đơn hàng ${shopOrder.shop_order_code} của bạn đã được cập nhật sang trạng thái ${newStatus}.`;
      if (newStatus === "CONFIRMED") {
        customerTitle = "Đơn hàng được xác nhận";
        customerContent = `Đơn hàng ${shopOrder.shop_order_code} đã được người bán xác nhận.`;
      } else if (newStatus === "PREPARING") {
        customerTitle = "Đang chuẩn bị hàng";
        customerContent = `Người bán đang chuẩn bị hàng cho đơn ${shopOrder.shop_order_code} của bạn.`;
      } else if (newStatus === "SHIPPING") {
        customerTitle = "Đang giao hàng";
        customerContent = `Đơn hàng ${shopOrder.shop_order_code} đang trên đường giao tới bạn.`;
      } else if (newStatus === "PICKED_UP") {
        customerTitle = "Shipper đã lấy hàng";
        customerContent = `Shipper đã lấy đơn hàng ${shopOrder.shop_order_code} của bạn thành công.`;
      } else if (newStatus === "IN_TRANSIT") {
        customerTitle = "Đang luân chuyển";
        customerContent = `Đơn hàng ${shopOrder.shop_order_code} của bạn đang được luân chuyển giữa các kho.`;
      } else if (newStatus === "DELIVERING") {
        customerTitle = "Đang giao hàng";
        customerContent = `Đơn hàng ${shopOrder.shop_order_code} đang trên đường giao tới bạn.`;
      } else if (newStatus === "DELIVERED") {
        customerTitle = "Giao hàng thành công";
        customerContent = `Đơn hàng ${shopOrder.shop_order_code} đã được giao thành công. Cảm ơn bạn đã mua sắm!`;
      } else if (newStatus === "FAILED") {
        customerTitle = "Giao hàng thất bại";
        customerContent = `Giao đơn hàng ${shopOrder.shop_order_code} thất bại. Lý do: ${note || "Không có lý do"}.`;
      } else if (newStatus === "RETURN_PENDING") {
        customerTitle = "Đang chuyển hoàn";
        customerContent = `Đơn hàng ${shopOrder.shop_order_code} giao thất bại và đang trên đường chuyển hoàn về người bán.`;
      } else if (newStatus === "RETURNED") {
        customerTitle = "Đã chuyển hoàn xong";
        customerContent = `Đơn hàng ${shopOrder.shop_order_code} đã hoàn trả thành công về người bán.`;
      }
      await notificationService.createNotification(customerId, customerTitle, customerContent, "ORDER_UPDATE");
    }

    const actualShipperId = shopOrder.shipper_id || (role === "shipper" ? userId : null);
    if (actualShipperId && userId !== actualShipperId) {
      let shipperTitle = "Cập nhật trạng thái đơn";
      let shipperContent = `Đơn hàng ${shopOrder.shop_order_code} bạn đang nhận giao đã có cập nhật trạng thái mới sang ${newStatus}.`;
      if (newStatus === "RETURNED") {
        shipperTitle = "Chuyển hoàn hoàn tất";
        shipperContent = `Cửa hàng đã xác nhận nhận lại hàng hoàn cho đơn hàng ${shopOrder.shop_order_code}.`;
      }
      await notificationService.createNotification(actualShipperId, shipperTitle, shipperContent, "ORDER_UPDATE");
    }

  } catch (notifErr) {
    console.error("Failed to create order status update notification:", notifErr);
  }

  return shopOrder;
};

const bulkUpdateOrderStatus = async (shopOrderIds, userId, newStatus, role) => {
  const results = [];
  const errors = [];

  for (const orderId of shopOrderIds) {
    try {
      const order = await updateOrderStatus(orderId, userId, newStatus, role);
      results.push(order);
    } catch (err) {
      errors.push({ orderId, message: err.message });
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(`Cập nhật thất bại: ${errors[0].message}`);
  }

  return { updated: results.length, errors };
};

const getShipperOrders = async (userId, { page = 1, limit = 10, status }) => {
  const where = {};

  if (status) {
    if (status === 'SHIPPING') {
      where.status = 'SHIPPING';
      where[db.Sequelize.Op.or] = [
        { shipper_id: null },
        { shipper_id: userId }
      ];
    } else {
      where.status = status;
      where.shipper_id = userId;
    }
  } else {
    where[db.Sequelize.Op.or] = [
      {
        status: 'SHIPPING',
        shipper_id: null
      },
      {
        shipper_id: userId
      }
    ];
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await db.ShopOrder.findAndCountAll({
    where,
    include: [
      { model: db.Shipment, as: "shipment" },
      {
        model: db.OrderItem,
        as: "items",
        include: [
          {
            model: db.ProductVariant,
            as: "variant",
            paranoid: false,
            include: [
              {
                model: db.Product,
                as: "product",
                paranoid: false,
                include: [{ model: db.ProductImage, as: "images" }]
              }
            ]
          }
        ]
      },
      { model: db.Shop, as: "shop", paranoid: false },
      {
        model: db.ParentOrder,
        as: "parentOrder",
        attributes: ['id', 'shipping_address', 'payment_method', 'payment_status', 'user_id', 'note']
      }
    ],
    order: [["updated_at", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  return {
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    orders: rows,
  };
};

const getOrderDetail = async (shopOrderId, userId) => {
  const shopOrder = await db.ShopOrder.findOne({
    where: { id: shopOrderId },
    include: [
      {
        model: db.OrderItem,
        as: "items",
        include: [
          {
            model: db.ProductVariant,
            as: "variant",
            paranoid: false,
            include: [
              {
                model: db.Product,
                as: "product",
                paranoid: false,
                include: [{ model: db.ProductImage, as: "images" }]
              }
            ]
          }
        ]
      },
      { model: db.Shop, as: "shop", paranoid: false },
      { model: db.ParentOrder, as: "parentOrder", attributes: ['id', 'shipping_address', 'payment_method', 'payment_status', 'user_id', 'note'] },
      { model: db.ProductReview, as: "reviews" },
      { model: db.ReturnRequest, as: "returnRequests" }
    ]
  });

  if (!shopOrder) throw new Error("Không tìm thấy đơn hàng");
  if (shopOrder.parentOrder.user_id !== userId) throw new Error("Không có quyền xem đơn hàng này");

  if (
    shopOrder.parentOrder.payment_method === "VNPAY" &&
    shopOrder.parentOrder.payment_status === "UNPAID" &&
    shopOrder.status !== "CANCELLED"
  ) {
    const hoursDiff = (new Date() - new Date(shopOrder.created_at)) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      await shopOrder.update({ status: "CANCELLED" });
      shopOrder.status = "CANCELLED";
      if (shopOrder.points_used && shopOrder.points_used > 0) {
        await db.User.increment('loyalty_points', { by: shopOrder.points_used, where: { id: shopOrder.parentOrder.user_id } });
      }
      const orderItems = await db.OrderItem.findAll({ where: { shop_order_id: shopOrder.id } });
      for (const item of orderItems) {
        if (item.variant_id) {
          await db.ProductVariant.increment("stock_quantity", { by: item.quantity, where: { id: item.variant_id }, paranoid: false });
        }
      }
    }
  }

  return shopOrder;
};

const cancelOrder = async (shopOrderId, userId, reason) => {
  const shopOrder = await db.ShopOrder.findByPk(shopOrderId, {
    include: [{ model: db.ParentOrder, as: "parentOrder" }]
  });
  if (!shopOrder) throw new Error("Không tìm thấy đơn hàng");
  if (shopOrder.parentOrder.user_id !== userId) throw new Error("Không có quyền hủy đơn hàng này");

  const isPreparing = shopOrder.status === 'PREPARING';
  const newStatus = isPreparing ? 'CANCEL_REQUESTED' : 'CANCELLED';

  const oldStatus = shopOrder.status;
  await shopOrder.update({ status: newStatus });

  // Refund points when cancelled
  if (newStatus === "CANCELLED" && oldStatus !== "CANCELLED") {
    if (shopOrder.points_used && shopOrder.points_used > 0) {
      await db.User.increment('loyalty_points', { by: shopOrder.points_used, where: { id: shopOrder.parentOrder.user_id } });
    }
    // Restore stock
    const orderItems = await db.OrderItem.findAll({ where: { shop_order_id: shopOrderId } });
    for (const item of orderItems) {
      if (item.variant_id) {
        await db.ProductVariant.increment("stock_quantity", {
          by: item.quantity,
          where: { id: item.variant_id },
          paranoid: false,
        });
      }
    }
    
    // CASH REFUND FOR CANCELLED (Convert to loyalty points)
    if (shopOrder.parentOrder && shopOrder.parentOrder.payment_method !== "COD") {
      if (shopOrder.parentOrder.payment_status !== "REFUNDED") {
        const redeemRateSetting = await db.SystemSetting.findOne({ where: { setting_key: 'LOYALTY_POINT_REDEEM_RATE' } });
        const redeemRate = redeemRateSetting ? Number(redeemRateSetting.setting_value) : 100;
        const refundAmount = Number(shopOrder.final_amount);
        const pointsToRefund = Math.floor(refundAmount / redeemRate);
        if (pointsToRefund > 0) {
          await db.User.increment('loyalty_points', { by: pointsToRefund, where: { id: shopOrder.parentOrder.user_id } });
        }
        await db.ParentOrder.update({ payment_status: "REFUNDED" }, { where: { id: shopOrder.parent_order_id } });
      }
    }
  }

  await db.ShopOrderStatusHistory.create({
    shop_order_id: shopOrderId,
    old_status: oldStatus,
    new_status: newStatus,
    note: reason || (isPreparing ? "Người dùng yêu cầu hủy" : "Người dùng hủy đơn"),
    changed_by: userId,
  });

  // Gửi thông báo
  try {
    // 1. Cho User (chính chủ)
    await notificationService.createNotification(
      userId,
      isPreparing ? "Yêu cầu hủy đơn hàng" : "Hủy đơn hàng thành công",
      isPreparing
        ? `Bạn đã gửi yêu cầu hủy đơn hàng ${shopOrder.shop_order_code}. Vui lòng chờ shop xác nhận.`
        : `Bạn đã hủy đơn hàng ${shopOrder.shop_order_code} thành công.`,
      "ORDER_UPDATE"
    );

    // 2. Cho Vendor
    const shop = await db.Shop.findByPk(shopOrder.shop_id);
    if (shop && shop.vendor_id) {
      await notificationService.createNotification(
        shop.vendor_id,
        isPreparing ? "Yêu cầu hủy đơn từ khách" : "Khách hàng hủy đơn hàng",
        isPreparing
          ? `Khách hàng yêu cầu hủy đơn hàng ${shopOrder.shop_order_code} (đơn hàng đã ở trạng thái chuẩn bị hàng).`
          : `Khách hàng đã hủy đơn hàng ${shopOrder.shop_order_code}.`,
        "ORDER_UPDATE"
      );
    }
  } catch (notifErr) {
    console.error("Failed to create cancelOrder notifications:", notifErr);
  }

  return shopOrder;
};

const autoCompleteDeliveredOrders = async () => {
  try {
    const setting = await db.SystemSetting.findOne({ where: { setting_key: 'order_confirm_period_days' } });
    const periodDays = setting ? parseFloat(setting.setting_value) : 15; // default 15 days if customer doesn't respond

    const deliveredOrders = await db.ShopOrder.findAll({
      where: { status: 'DELIVERED' },
      include: [{ model: db.ParentOrder, as: 'parentOrder' }]
    });

    const now = new Date();
    for (const order of deliveredOrders) {
      const deliveryTime = order.delivered_at || order.updated_at;
      const diffMs = now - new Date(deliveryTime);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= periodDays) {
        await updateOrderStatus(
          order.id,
          null,
          'COMPLETED',
          'system',
          `Tự động xác nhận đã nhận hàng sau ${periodDays} ngày không phản hồi`
        );
      }
    }
  } catch (error) {
    console.error("Lỗi tự động hoàn tất đơn hàng:", error);
  }
};

export default { calculateCheckout, createOrder, getUserOrders, getUserOrderCounts, updateOrderStatus, getOrderDetail, cancelOrder, getShipperOrders, bulkUpdateOrderStatus, autoCompleteDeliveredOrders, autoAssignShipperByArea };


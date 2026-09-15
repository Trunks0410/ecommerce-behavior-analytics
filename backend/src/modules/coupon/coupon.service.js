import db from "../../database/models/index.js";
const { Coupon, UserCoupon, Sequelize } = db;
const Op = Sequelize.Op;

const getValidCoupons = async (userId) => {
  const currentDate = new Date();
  
  // Lấy các mã còn hiệu lực, còn hạn sử dụng, và số lượng used_count < usage_limit (nếu có giới hạn)
  const coupons = await Coupon.findAll({
    where: {
      start_date: { [Op.lte]: currentDate },
      end_date: { [Op.gte]: currentDate },
      [Op.or]: [
        { usage_limit: null },
        { usage_limit: { [Op.gt]: db.sequelize.col('used_count') } }
      ]
    },
    include: [{
      model: db.Category,
      as: 'category',
      attributes: ['name']
    }],
    order: [["discount_value", "DESC"]],
  });

  if (!userId) return coupons;

  // Lấy danh sách các ID mã đã lưu của user
  const savedCoupons = await UserCoupon.findAll({
    where: { user_id: userId, is_used: false },
    attributes: ['coupon_id']
  });
  const savedCouponIds = savedCoupons.map(sc => sc.coupon_id.toString());

  // Thêm thuộc tính isSaved
  return coupons.map(c => {
    const data = c.toJSON();
    data.isSaved = savedCouponIds.includes(c.id.toString());
    return data;
  });
};

const saveCoupon = async (userId, couponId) => {
  const coupon = await Coupon.findByPk(couponId);
  if (!coupon) throw new Error("Mã giảm giá không tồn tại");

  const currentDate = new Date();
  if (coupon.end_date < currentDate) {
    throw new Error("Mã giảm giá đã hết hạn");
  }
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    throw new Error("Mã giảm giá đã hết lượt sử dụng");
  }

  const [userCoupon, created] = await UserCoupon.findOrCreate({
    where: { user_id: userId, coupon_id: couponId },
    defaults: {
      is_used: false,
    }
  });

  if (!created) {
    throw new Error("Bạn đã lưu mã giảm giá này rồi");
  }

  return userCoupon;
};

const unsaveCoupon = async (userId, couponId) => {
  const userCoupon = await UserCoupon.findOne({
    where: { user_id: userId, coupon_id: couponId, is_used: false }
  });

  if (!userCoupon) {
    throw new Error("Không tìm thấy mã giảm giá đã lưu hoặc mã đã được sử dụng");
  }

  await userCoupon.destroy();
  return true;
};

const getMySavedCoupons = async (userId) => {
  const currentDate = new Date();

  const savedCoupons = await UserCoupon.findAll({
    where: { user_id: userId, is_used: false },
    include: [{
      model: Coupon,
      as: 'coupon',
      include: [{
        model: db.Category,
        as: 'category',
        attributes: ['name']
      }],
      where: {
        end_date: { [Op.gte]: currentDate },
        [Op.or]: [
          { usage_limit: null },
          { usage_limit: { [Op.gt]: db.sequelize.col('coupon.used_count') } }
        ]
      }
    }]
  });

  // Trả về cấu trúc giống hệt Coupon nhưng chỉ những cái user đã lưu
  return savedCoupons.map(sc => sc.coupon);
};

const markCouponAsUsed = async (userId, couponId, transaction) => {
  const userCoupon = await UserCoupon.findOne({
    where: { user_id: userId, coupon_id: couponId, is_used: false },
    transaction
  });

  if (userCoupon) {
    userCoupon.is_used = true;
    userCoupon.used_at = new Date();
    await userCoupon.save({ transaction });
  }
};

const getMyVoucherWallet = async (userId) => {
  const currentDate = new Date();

  const savedCoupons = await UserCoupon.findAll({
    where: { user_id: userId },
    include: [{
      model: Coupon,
      as: 'coupon',
      include: [{
        model: db.Category,
        as: 'category',
        attributes: ['name']
      }]
    }],
    order: [['saved_at', 'DESC']]
  });

  const validCoupons = [];
  const historyCoupons = [];

  for (const sc of savedCoupons) {
    const coupon = sc.coupon;
    if (!coupon) continue;
    
    // Kiểm tra tính hợp lệ
    const isExpired = coupon.end_date < currentDate;
    const isOutOfLimit = coupon.usage_limit && coupon.used_count >= coupon.usage_limit;
    
    if (sc.is_used || isExpired || isOutOfLimit) {
      historyCoupons.push({ ...coupon.toJSON(), userCouponStatus: sc.is_used ? 'USED' : 'EXPIRED' });
    } else {
      validCoupons.push({ ...coupon.toJSON(), userCouponStatus: 'VALID' });
    }
  }

  return { validCoupons, historyCoupons };
};

const saveCouponByCode = async (userId, code) => {
  const coupon = await Coupon.findOne({ where: { code } });
  if (!coupon) throw new Error("Mã giảm giá không tồn tại");

  const currentDate = new Date();
  if (coupon.end_date < currentDate) {
    throw new Error("Mã giảm giá đã hết hạn");
  }
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    throw new Error("Mã giảm giá đã hết lượt sử dụng");
  }

  const [userCoupon, created] = await UserCoupon.findOrCreate({
    where: { user_id: userId, coupon_id: coupon.id },
    defaults: {
      is_used: false,
    }
  });

  if (!created) {
    throw new Error("Bạn đã lưu mã giảm giá này rồi");
  }

  return userCoupon;
};

export default {
  getValidCoupons,
  saveCoupon,
  unsaveCoupon,
  getMySavedCoupons,
  markCouponAsUsed,
  getMyVoucherWallet,
  saveCouponByCode,
};

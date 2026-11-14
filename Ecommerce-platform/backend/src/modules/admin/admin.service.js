import db from "../../database/models/index.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { sendShipperAccountCreated } from "../../core/utils/emailService.js";
import notificationService from "../notification/notification.service.js";

// ============================================================
// 1. QUẢN LÝ TÀI KHOẢN MANAGER
// ============================================================

const createUser = async (adminId, { email, password, full_name, role, phone, gender, shipper_shop_id }) => {
  const transaction = await db.sequelize.transaction();
  try {
    // Kiểm tra email đã tồn tại
    const existingUser = await db.User.findOne({ where: { email }, transaction });
    if (existingUser) throw new Error("Email đã được sử dụng");

    // Map customer -> user
    let targetRoleName = role || "manager";
    if (targetRoleName === "customer") {
      targetRoleName = "user";
    }

    // Kiểm tra số điện thoại đã tồn tại
    if (phone) {
      const existingPhone = await db.User.findOne({ where: { phone }, transaction });
      if (existingPhone) throw new Error("Số điện thoại đã được sử dụng");
    }

    // Tìm role
    const dbRole = await db.Role.findOne({ where: { role_name: targetRoleName }, transaction });
    if (!dbRole) throw new Error(`Không tìm thấy vai trò ${role} trong hệ thống`);

    // Tạo mật khẩu ngẫu nhiên cho shipper
    let finalPassword = password;
    if (targetRoleName === "shipper") {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      finalPassword = "";
      for (let i = 0; i < 8; i++) {
        finalPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    if (!finalPassword) {
      throw new Error("Mật khẩu là bắt buộc");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(finalPassword, salt);

    // Tạo user
    const user = await db.User.create({
      email,
      phone: phone || null,
      password: hashedPassword,
      role_id: dbRole.id,
      status: "ACTIVE",
      auth_provider: "local",
    }, { transaction });

    // Tạo profile
    await db.UserProfile.create({
      user_id: user.id,
      full_name: full_name || null,
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150",
      gender: gender || null,
      shipper_shop_id: shipper_shop_id || null,
    }, { transaction });

    // Nếu role là vendor, tạo thêm shop mặc định
    if (targetRoleName === "vendor") {
      await db.Shop.create({
        vendor_id: user.id,
        shop_name: `Shop của ${full_name || email.split("@")[0]}`,
        shop_logo: "https://images.unsplash.com/photo-1472851294608-062f824d296e?q=80&w=150",
        description: `Cửa hàng của ${full_name || email.split("@")[0]}`,
        status: "APPROVED",
      }, { transaction });
    }

    await transaction.commit();

    // Gửi thông báo cho Admin (chính chủ)
    if (adminId) {
      try {
        await notificationService.createNotification(
          adminId,
          "Tạo tài khoản thành công",
          `Bạn đã tạo thành công tài khoản email ${email} vai trò ${targetRoleName}.`,
          "USER_MANAGEMENT"
        );
      } catch (notifErr) {
        console.error("Failed to create admin create user notification:", notifErr);
      }
    }

    // Gửi email cho shipper sau khi commit thành công
    if (targetRoleName === "shipper") {
      try {
        await sendShipperAccountCreated(email, full_name, finalPassword);
      } catch (emailError) {
        console.error("Failed to send shipper creation email:", emailError);
      }
    }

    return {
      id: user.id,
      email: user.email,
      full_name,
      role: targetRoleName,
      status: user.status,
      created_at: user.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getUsersByRole = async (roleName) => {
  let targetRoleName = roleName;
  if (targetRoleName === "customer") {
    targetRoleName = "user";
  }

  const role = await db.Role.findOne({ where: { role_name: targetRoleName } });
  if (!role) return [];

  return await db.User.findAll({
    where: { role_id: role.id },
    attributes: ["id", "email", "phone", "status", "created_at", "updated_at"],
    include: [{
      model: db.UserProfile,
      as: "profile",
      attributes: ["full_name", "avatar_url", "birthday", "gender", "shipper_shop_id"],
      include: [{
        model: db.Shop,
        as: "shipperShop",
        attributes: ["id", "shop_name"],
      }],
    }],
    order: [["created_at", "DESC"]],
  });
};

const lockUser = async (adminId, userId) => {
  const user = await db.User.findByPk(userId, {
    include: [{ model: db.Role, as: "role" }],
  });
  if (!user) throw new Error("Không tìm thấy tài khoản");
  if (user.role.role_name === "admin") throw new Error("Không thể khóa tài khoản Admin");
  if (user.status === "LOCKED") throw new Error("Tài khoản đã bị khóa trước đó");

  await user.update({ status: "LOCKED" });

  // Gửi thông báo cho Admin (chính chủ)
  if (adminId) {
    try {
      await notificationService.createNotification(
        adminId,
        "Khóa tài khoản thành công",
        `Bạn đã khóa thành công tài khoản của người dùng ${user.email}.`,
        "USER_MANAGEMENT"
      );
    } catch (notifErr) {
      console.error("Failed to create admin lock user notification:", notifErr);
    }
  }

  return user;
};

const unlockUser = async (adminId, userId) => {
  const user = await db.User.findByPk(userId, {
    include: [{ model: db.Role, as: "role" }],
  });
  if (!user) throw new Error("Không tìm thấy tài khoản");
  if (user.role.role_name === "admin") throw new Error("Không thể thao tác trên tài khoản Admin");
  if (user.status === "ACTIVE") throw new Error("Tài khoản đang hoạt động bình thường");

  await user.update({ status: "ACTIVE" });

  // Gửi thông báo cho Admin (chính chủ)
  if (adminId) {
    try {
      await notificationService.createNotification(
        adminId,
        "Mở khóa tài khoản thành công",
        `Bạn đã mở khóa thành công tài khoản của người dùng ${user.email}.`,
        "USER_MANAGEMENT"
      );
    } catch (notifErr) {
      console.error("Failed to create admin unlock user notification:", notifErr);
    }
  }

  return user;
};

const updateUserProfileByAdmin = async (userId, { email, phone, full_name, gender, birthday, password, avatar_url }) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await db.User.findByPk(userId, { transaction });
    if (!user) throw new Error("Không tìm thấy tài khoản");

    // Cập nhật email nếu thay đổi
    if (email && email !== user.email) {
      const existingEmail = await db.User.findOne({ where: { email }, transaction });
      if (existingEmail) throw new Error("Email đã được sử dụng bởi tài khoản khác");
      await user.update({ email }, { transaction });
    }

    // Cập nhật số điện thoại nếu thay đổi
    if (phone && phone !== user.phone) {
      const existingPhone = await db.User.findOne({ where: { phone }, transaction });
      if (existingPhone) throw new Error("Số điện thoại đã được sử dụng bởi tài khoản khác");
      await user.update({ phone }, { transaction });
    }

    // Cập nhật mật khẩu nếu có
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await user.update({ password: hashedPassword }, { transaction });
    }

    // Cập nhật Profile
    let profile = await db.UserProfile.findOne({ where: { user_id: userId }, transaction });
    if (profile) {
      await profile.update({
        full_name: full_name !== undefined ? full_name : profile.full_name,
        gender: gender !== undefined ? gender : profile.gender,
        birthday: birthday !== undefined ? birthday : profile.birthday,
        avatar_url: avatar_url !== undefined ? avatar_url : profile.avatar_url,
      }, { transaction });
    } else {
      await db.UserProfile.create({
        user_id: userId,
        full_name: full_name || null,
        gender: gender || null,
        birthday: birthday || null,
        avatar_url: avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150",
      }, { transaction });
    }

    await transaction.commit();

    // Lấy lại user và profile đã cập nhật
    return await db.User.findByPk(userId, {
      attributes: ["id", "email", "phone", "status", "created_at", "updated_at"],
      include: [{
        model: db.UserProfile,
        as: "profile",
        attributes: ["full_name", "avatar_url", "birthday", "gender", "shipper_shop_id"],
        include: [{
          model: db.Shop,
          as: "shipperShop",
          attributes: ["id", "shop_name"],
        }],
      }],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};


// ============================================================
// 2. PHÊ DUYỆT / TỪ CHỐI GIAN HÀNG VENDOR
// ============================================================

const getAllShops = async (status) => {
  const where = {};
  if (status) where.status = status;

  return await db.Shop.findAll({
    where,
    include: [{
      model: db.User,
      as: "vendor",
      attributes: ["id", "email", "phone", "status"],
      include: [{
        model: db.UserProfile,
        as: "profile",
        attributes: ["full_name", "avatar_url"],
      }],
    }],
    order: [["created_at", "DESC"]],
  });
};

const getPendingShops = async () => {
  return await getAllShops("PENDING");
};

const approveShop = async (adminId, shopId) => {
  const shop = await db.Shop.findByPk(shopId);
  if (!shop) throw new Error("Không tìm thấy gian hàng");
  if (shop.status === "APPROVED") throw new Error("Gian hàng đã được duyệt trước đó");

  const transaction = await db.sequelize.transaction();
  try {
    await shop.update({ status: "APPROVED" }, { transaction });

    // Cập nhật role cho user thành VENDOR khi shop được phê duyệt
    const vendorRole = await db.Role.findOne({ where: { role_name: "vendor" }, transaction });
    if (vendorRole && shop.vendor_id) {
      await db.User.update(
        { role_id: vendorRole.id },
        { where: { id: shop.vendor_id }, transaction }
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  // Gửi thông báo cho Vendor
  if (shop.vendor_id) {
    try {
      await notificationService.createNotification(
        shop.vendor_id,
        "Gian hàng đã được duyệt",
        `Gian hàng "${shop.shop_name}" của bạn đã được quản trị viên phê duyệt hoạt động.`,
        "SHOP_STATUS"
      );
    } catch (notifErr) {
      console.error("Failed to create shop approval notification:", notifErr);
    }
  }

  // Gửi thông báo cho Admin (chính chủ)
  if (adminId) {
    try {
      await notificationService.createNotification(
        adminId,
        "Duyệt gian hàng thành công",
        `Bạn đã phê duyệt hoạt động thành công cho gian hàng "${shop.shop_name}".`,
        "SHOP_STATUS"
      );
    } catch (notifErr) {
      console.error("Failed to create admin shop approval notification:", notifErr);
    }
  }

  return shop;
};

const rejectShop = async (adminId, shopId, reason) => {
  const shop = await db.Shop.findByPk(shopId);
  if (!shop) throw new Error("Không tìm thấy gian hàng");
  if (shop.status === "REJECTED") throw new Error("Gian hàng đã bị từ chối trước đó");

  await shop.update({ status: "REJECTED" });

  // Gửi thông báo cho Vendor
  if (shop.vendor_id) {
    try {
      await notificationService.createNotification(
        shop.vendor_id,
        "Yêu cầu đăng ký gian hàng bị từ chối",
        `Đơn đăng ký gian hàng "${shop.shop_name}" của bạn đã bị từ chối. Lý do: ${reason || "Không có lý do cụ thể"}.`,
        "SHOP_STATUS"
      );
    } catch (notifErr) {
      console.error("Failed to create shop rejection notification:", notifErr);
    }
  }

  // Gửi thông báo cho Admin (chính chủ)
  if (adminId) {
    try {
      await notificationService.createNotification(
        adminId,
        "Từ chối gian hàng thành công",
        `Bạn đã từ chối đơn đăng ký gian hàng "${shop.shop_name}". Lý do: ${reason || "Không có lý do cụ thể"}.`,
        "SHOP_STATUS"
      );
    } catch (notifErr) {
      console.error("Failed to create admin shop rejection notification:", notifErr);
    }
  }

  // Trả về reason để frontend hiển thị (reason lưu ở frontend notification)
  return { ...shop.toJSON(), reject_reason: reason };
};


// ============================================================
// 3. CẤU HÌNH THÔNG SỐ HỆ THỐNG
// ============================================================

const getSystemSettings = async () => {
  return await db.SystemSetting.findAll({
    order: [["setting_key", "ASC"]],
  });
};

const updateSystemSetting = async (adminId, key, value) => {
  let setting = await db.SystemSetting.findByPk(key);
  if (!setting) {
    setting = await db.SystemSetting.create({
      setting_key: key,
      setting_value: value,
      updated_by: adminId,
    });
  } else {
    await setting.update({
      setting_value: value,
      updated_by: adminId,
    });
  }
  return setting;
};

// Quản lý danh mục
const getCategoriesAdmin = async () => {
  return await db.Category.findAll({
    attributes: ["id", "name", "slug", "parent_id", "image_url", "description", "is_active"],
    order: [["name", "ASC"]],
  });
};

const createCategory = async (data) => {
  const { name, description, parent_id, image_url } = data;

  // Tạo slug từ tên
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  return await db.Category.create({
    name,
    slug,
    description: description || null,
    parent_id: parent_id || null,
    image_url: image_url || null,
    is_active: 1,
  });
};

const updateCategory = async (id, data) => {
  const category = await db.Category.findByPk(id);
  if (!category) throw new Error("Không tìm thấy danh mục");

  const updateData = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.parent_id !== undefined) updateData.parent_id = data.parent_id;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  await category.update(updateData);
  return category;
};

const deleteCategory = async (id) => {
  const category = await db.Category.findByPk(id);
  if (!category) throw new Error("Không tìm thấy danh mục");

  // Kiểm tra danh mục con
  const children = await db.Category.count({ where: { parent_id: id } });
  if (children > 0) throw new Error("Không thể xóa danh mục có chứa danh mục con");

  // Kiểm tra sản phẩm sử dụng
  const products = await db.Product.count({ where: { category_id: id } });
  if (products > 0) throw new Error("Không thể xóa danh mục đang có sản phẩm");

  await category.destroy();
  return { message: "Xóa danh mục thành công" };
};


// ============================================================
// 4. BÁO CÁO TÀI CHÍNH TỔNG & DÒNG TIỀN
// ============================================================

const getFinancialReport = async (dateFrom, dateTo, groupBy, shopMonth, shopYear) => {
  // Lấy cấu hình tỷ lệ từ system_settings
  const settings = await db.SystemSetting.findAll();
  const settingsMap = {};
  settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

  const commissionRate = parseFloat(settingsMap.default_commission_rate || "10.00");
  const gatewayFee = parseFloat(settingsMap.payment_gateway_fee || "5.00");
  const taxRate = parseFloat(settingsMap.tax_rate || "1.50");

  // Xác định khoảng thời gian thực tế để query tối ưu hiệu năng
  let start, end;
  if (dateFrom || dateTo) {
    if (dateFrom) {
      const [year, month, day] = dateFrom.split("-").map(Number);
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      start = new Date(2020, 0, 1, 0, 0, 0, 0);
    }
    
    if (dateTo) {
      const [year, month, day] = dateTo.split("-").map(Number);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }
  } else {
    // Mặc định là tháng hiện tại nếu không lọc
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const dateFilter = {
    [Op.gte]: start,
    [Op.lte]: end
  };

  const shopOrderWhere = { status: { [db.Sequelize.Op.in]: ["DELIVERED", "COMPLETED"] } };
  // Lọc theo ngày giao thành công (delivered_at), dùng updated_at làm fallback nếu dữ liệu cũ chưa cập nhật cột này
  shopOrderWhere[Op.or] = [
    {
      delivered_at: dateFilter
    },
    {
      delivered_at: null,
      updated_at: dateFilter
    }
  ];

  // Lấy tất cả shop_orders DELIVERED kèm parent_order (để biết payment_method)
  const deliveredOrders = await db.ShopOrder.findAll({
    where: shopOrderWhere,
    include: [{
      model: db.ParentOrder,
      as: "parentOrder",
      attributes: ["id", "payment_method", "payment_status", "user_id", "created_at"],
    }, {
      model: db.Shop,
      as: "shop",
      attributes: ["id", "shop_name"],
    }],
  });

  let totalRevenue = 0;
  let codRevenue = 0;
  let onlineRevenue = 0;
  let codOrderCount = 0;
  let onlineOrderCount = 0;

  // Các biến cộng dồn thực tế
  let codCommission = 0;
  let codTax = 0;
  let codShopPayout = 0;
  
  let onlineCommission = 0;
  let onlineTax = 0;
  let onlineGatewayFee = 0;
  let onlineShopPayout = 0;

  // Tiền ship và chi phí voucher sàn
  let totalShippingFee = 0;
  let platformVoucherCost = 0;

  // Doanh thu theo shop
  const shopRevenueMap = {};

  for (const order of deliveredOrders) {
    const finalAmount = parseFloat(order.final_amount || 0); // Tiền khách thực trả

    // Phí vận chuyển
    const shippingFee = parseFloat(order.shipping_fee || 0);
    totalShippingFee += shippingFee;

    // Cơ sở tính doanh thu, chiết khấu và thuế: subtotal - shop_discount (KHÔNG BAO GỒM TIỀN SHIP)
    const baseAmount = Math.max(0, parseFloat(order.subtotal || 0) - parseFloat(order.discount_amount || 0));
    
    // Chi phí voucher sàn (Sàn tài trợ): baseAmount + shippingFee - finalAmount
    const voucherCost = Math.max(0, baseAmount + shippingFee - finalAmount);
    platformVoucherCost += voucherCost;

    // Đổi "Doanh thu" trên báo cáo thành baseAmount để khớp công thức: Doanh thu - Phí = Shop nhận về
    const revenueToReport = baseAmount;
    
    totalRevenue += revenueToReport;

    const commission = parseFloat(order.commission_amount || 0);
    const tax = baseAmount * (taxRate / 100);
    
    // Shop nhận về = Cơ sở - Chiết khấu - Thuế
    const shopPayout = baseAmount - commission - tax;

    const isCOD = order.parentOrder.payment_method === "COD";
    if (isCOD) {
      codRevenue += revenueToReport;
      codCommission += commission;
      codTax += tax;
      codShopPayout += shopPayout;
      codOrderCount++;
    } else {
      onlineRevenue += revenueToReport;
      onlineCommission += commission;
      onlineTax += tax;
      // Phí cổng thanh toán tính trên số tiền thực tế khách quẹt thẻ
      const gatewayFeeAmount = finalAmount * (gatewayFee / 100);
      onlineGatewayFee += gatewayFeeAmount;
      onlineShopPayout += (shopPayout - gatewayFeeAmount);
      onlineOrderCount++;
    }

    // Thống kê theo shop
    const shopId = order.shop_id;
    if (!shopRevenueMap[shopId]) {
      shopRevenueMap[shopId] = {
        shop_id: shopId,
        shop_name: order.shop?.shop_name || "N/A",
        total_revenue: 0,
        order_count: 0,
        cod_revenue: 0,
        online_revenue: 0,
      };
    }
    shopRevenueMap[shopId].total_revenue += revenueToReport;
    shopRevenueMap[shopId].order_count++;
    if (isCOD) {
      shopRevenueMap[shopId].cod_revenue += revenueToReport;
    } else {
      shopRevenueMap[shopId].online_revenue += revenueToReport;
    }
  }

  const codTotalDeduction = codCommission + codTax;
  const onlineTotalDeduction = onlineCommission + onlineGatewayFee + onlineTax;

  // Tổng hợp
  const totalCommission = codCommission + onlineCommission;
  const totalGatewayFee = onlineGatewayFee; // Chỉ Thẻ có phí cổng
  const totalTax = codTax + onlineTax;
  const totalDeduction = codTotalDeduction + onlineTotalDeduction;
  const totalShopPayout = codShopPayout + onlineShopPayout;

  // Thống kê đơn theo trạng thái (toàn bộ, không lọc ngày)
  const ordersByStatus = await db.ShopOrder.findAll({
    attributes: [
      "status",
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  // Top shops theo doanh thu
  const topShops = Object.values(shopRevenueMap)
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10);

  // Xác định kiểu group tự động dựa trên khoảng cách ngày nếu không truyền lên
  let activeGroupBy = groupBy;
  if (!activeGroupBy) {
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 10) {
      activeGroupBy = "day";
    } else if (diffDays <= 31) {
      activeGroupBy = "day"; // Mặc định hiển thị theo ngày khi chọn tháng
    } else {
      activeGroupBy = "month";
    }
  }

  const dailyRevenue = [];

  if (activeGroupBy === "day") {
    const current = new Date(start);
    while (current <= end) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      let dayTotal = 0;
      for (const order of deliveredOrders) {
        const orderDate = new Date(order.delivered_at || order.updated_at);
        if (orderDate >= dayStart && orderDate <= dayEnd) {
          dayTotal += parseFloat(order.final_amount || 0);
        }
      }

      // Format label: "Thứ X (DD/MM)" cho từng ngày
      const daysOfWeek = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const label = `${daysOfWeek[current.getDay()]} (${current.getDate().toString().padStart(2, '0')}/${(current.getMonth() + 1).toString().padStart(2, '0')})`;
      dailyRevenue.push({
        date: label,
        revenue: dayTotal,
      });

      current.setDate(current.getDate() + 1);
    }
  } else if (activeGroupBy === "week") {
    // Chia tuần: Nếu start và end thuộc cùng một tháng và là trọn tháng (ngày 1 -> ngày cuối tháng)
    const isFullMonth = start.getDate() === 1 && (end.getDate() >= 28 && end.getDate() <= 31);

    if (isFullMonth) {
      const year = start.getFullYear();
      const month = start.getMonth();
      const lastDay = end.getDate();

      const weeks = [
        { label: "Tuần 1", start: new Date(year, month, 1, 0, 0, 0, 0), end: new Date(year, month, 7, 23, 59, 59, 999) },
        { label: "Tuần 2", start: new Date(year, month, 8, 0, 0, 0, 0), end: new Date(year, month, 14, 23, 59, 59, 999) },
        { label: "Tuần 3", start: new Date(year, month, 15, 0, 0, 0, 0), end: new Date(year, month, 21, 23, 59, 59, 999) },
        { label: "Tuần 4", start: new Date(year, month, 22, 0, 0, 0, 0), end: new Date(year, month, lastDay, 23, 59, 59, 999) },
      ];

      for (const w of weeks) {
        let revenue = 0;
        for (const order of deliveredOrders) {
          const orderDate = new Date(order.delivered_at || order.updated_at);
          if (orderDate >= w.start && orderDate <= w.end) {
            revenue += parseFloat(order.final_amount || 0);
          }
        }
        dailyRevenue.push({
          date: w.label,
          revenue: revenue
        });
      }
    } else {
      // Chia 7 ngày bắt đầu từ ngày start
      const current = new Date(start);
      let weekNum = 1;
      while (current <= end) {
        const wStart = new Date(current);
        wStart.setHours(0, 0, 0, 0);

        const wEnd = new Date(current);
        wEnd.setDate(current.getDate() + 6);
        if (wEnd > end) {
          wEnd.setTime(end.getTime());
        }
        wEnd.setHours(23, 59, 59, 999);

        let revenue = 0;
        for (const order of deliveredOrders) {
          const orderDate = new Date(order.delivered_at || order.updated_at);
          if (orderDate >= wStart && orderDate <= wEnd) {
            revenue += parseFloat(order.final_amount || 0);
          }
        }

        const label = `Tuần ${weekNum}`;
        dailyRevenue.push({
          date: label,
          revenue: revenue
        });

        weekNum++;
        current.setDate(current.getDate() + 7);
      }
    }
  } else if (activeGroupBy === "month") {
    const current = new Date(start);
    current.setDate(1);

    while (current <= end) {
      const mStart = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
      const mEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

      let revenue = 0;
      for (const order of deliveredOrders) {
        const orderDate = new Date(order.delivered_at || order.updated_at);
        if (orderDate >= mStart && orderDate <= mEnd) {
          revenue += parseFloat(order.final_amount || 0);
        }
      }

      const label = `Tháng ${current.getMonth() + 1}`;
      dailyRevenue.push({
        date: label,
        revenue: revenue
      });

      current.setMonth(current.getMonth() + 1);
    }
  } else if (activeGroupBy === "year") {
    const current = new Date(start);
    while (current.getFullYear() <= end.getFullYear()) {
      const yStart = new Date(current.getFullYear(), 0, 1, 0, 0, 0, 0);
      const yEnd = new Date(current.getFullYear(), 11, 31, 23, 59, 59, 999);

      let revenue = 0;
      for (const order of deliveredOrders) {
        const orderDate = new Date(order.delivered_at || order.updated_at);
        if (orderDate >= yStart && orderDate <= yEnd) {
          revenue += parseFloat(order.final_amount || 0);
        }
      }

      dailyRevenue.push({
        date: `Năm ${current.getFullYear()}`,
        revenue: revenue
      });

      current.setFullYear(current.getFullYear() + 1);
    }
  }



  // --- Tính toán shop_reports theo tháng/năm được chọn ---
  const now = new Date();
  const activeShopMonth = shopMonth ? parseInt(shopMonth) : (now.getMonth() + 1);
  const activeShopYear = shopYear ? parseInt(shopYear) : now.getFullYear();

  const shopRangeStart = new Date(activeShopYear, activeShopMonth - 1, 1, 0, 0, 0, 0);
  const shopRangeEnd = new Date(activeShopYear, activeShopMonth, 0, 23, 59, 59, 999);

  const shopOrders = await db.ShopOrder.findAll({
    where: {
      status: { [db.Sequelize.Op.in]: ["DELIVERED", "COMPLETED"] },
      [Op.or]: [
        {
          delivered_at: { [Op.between]: [shopRangeStart, shopRangeEnd] }
        },
        {
          delivered_at: null,
          updated_at: { [Op.between]: [shopRangeStart, shopRangeEnd] }
        }
      ]
    },
    include: [{
      model: db.ParentOrder,
      as: "parentOrder",
      attributes: ["id", "payment_method"],
    }, {
      model: db.Shop,
      as: "shop",
      attributes: ["id", "shop_name"],
    }],
  });

  const localMap = {};
  for (const order of shopOrders) {
    const amount = parseFloat(order.final_amount || 0);
    const isCOD = order.parentOrder?.payment_method === "COD";
    const sId = order.shop_id;
    if (!localMap[sId]) {
      localMap[sId] = {
        shop_id: sId,
        shop_name: order.shop?.shop_name || "N/A",
        total_revenue: 0,
        order_count: 0,
        cod_revenue: 0,
        online_revenue: 0,
      };
    }
    localMap[sId].total_revenue += amount;
    localMap[sId].order_count++;
    if (isCOD) {
      localMap[sId].cod_revenue += amount;
    } else {
      localMap[sId].online_revenue += amount;
    }
  }

  const shopReports = Object.values(localMap).map((shop) => {
    const codComm = shop.cod_revenue * (commissionRate / 100);
    const codTx = shop.cod_revenue * (taxRate / 100);
    const codPayout = shop.cod_revenue - (codComm + codTx);

    const onlineComm = shop.online_revenue * (commissionRate / 100);
    const onlineGate = shop.online_revenue * (gatewayFee / 100);
    const onlineTx = shop.online_revenue * (taxRate / 100);
    const onlinePayout = shop.online_revenue - (onlineComm + onlineGate + onlineTx);

    return {
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      order_count: shop.order_count,
      total_revenue: shop.total_revenue,
      commission: codComm + onlineComm,
      gateway_fee: onlineGate,
      tax: codTx + onlineTx,
      payout: codPayout + onlinePayout,
    };
  }).sort((a, b) => b.total_revenue - a.total_revenue);

  return {
    // Tỷ lệ cấu hình
    rates: {
      commission_rate: commissionRate,
      gateway_fee: gatewayFee,
      tax_rate: taxRate,
    },

    // Tổng quan
    summary: {
      total_revenue: totalRevenue,
      total_shipping_fee: totalShippingFee,
      platform_voucher_cost: platformVoucherCost,
      total_orders: deliveredOrders.length,
      total_commission: totalCommission,
      total_gateway_fee: totalGatewayFee,
      total_tax: totalTax,
      total_deduction: totalDeduction,
      total_shop_payout: totalShopPayout,
      platform_profit: totalCommission, // Lợi nhuận sàn = chiết khấu (chưa trừ chi phí vận hành/voucher)
    },

    // Phân tách COD
    cod: {
      revenue: codRevenue,
      order_count: codOrderCount,
      commission: codCommission,
      tax: codTax,
      total_deduction: codTotalDeduction,
      deduction_rate: commissionRate + taxRate, // 11.5%
      shop_payout: codShopPayout,
    },

    // Phân tách Thẻ trực tuyến
    online: {
      revenue: onlineRevenue,
      order_count: onlineOrderCount,
      commission: onlineCommission,
      gateway_fee: onlineGatewayFee,
      tax: onlineTax,
      total_deduction: onlineTotalDeduction,
      deduction_rate: commissionRate + gatewayFee + taxRate, // 16.5%
      shop_payout: onlineShopPayout,
    },

    // Thống kê
    orders_by_status: ordersByStatus,
    top_shops: topShops,
    daily_revenue: dailyRevenue,
    shop_reports: shopReports,
  };
};

// ============================================================
// 5. ĐỐI SOÁT THANH TOÁN & DUYỆT LỆNH TRẢ TIỀN
// ============================================================

const getPaymentReconciliation = async () => {
  // Lấy tất cả shop kèm bank info, ví và vendor info
  const shops = await db.Shop.findAll({
    where: { status: "APPROVED" },
    attributes: ["id", "shop_name", "shop_logo", "bank_name", "bank_account_no", "bank_account_name"],
    include: [
      {
        model: db.User,
        as: "vendor",
        attributes: ["id", "email"],
        include: [{
          model: db.UserProfile,
          as: "profile",
          attributes: ["full_name"],
        }],
      },
      {
        model: db.ShopWallet,
        as: "wallet"
      }
    ],
    order: [["shop_name", "ASC"]],
  });

  // Lấy cấu hình tỷ lệ
  const settings = await db.SystemSetting.findAll();
  const settingsMap = {};
  settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
  const commissionRate = parseFloat(settingsMap.default_commission_rate || "10.00");
  const gatewayFee = parseFloat(settingsMap.payment_gateway_fee || "5.00");
  const taxRate = parseFloat(settingsMap.tax_rate || "1.50");

  const result = [];
  for (const shop of shops) {
    const latestPayout = await db.ShopPayout.findOne({
      where: { shop_id: shop.id },
      order: [["created_at", "DESC"]],
    });

    let reconciliation_status = "WAITING";
    if (latestPayout) {
      if (latestPayout.status === "PENDING" || latestPayout.status === "PENDING_APPROVAL" || latestPayout.status === "PROCESSING") {
        reconciliation_status = "WITHDRAWAL_REQUESTED";
      } else if (latestPayout.status === "COMPLETED") {
        reconciliation_status = "COMPLETED";
      }
    }

    const availableBalance = shop.wallet ? parseFloat(shop.wallet.balance || 0) : 0;
    const pendingBalance = shop.wallet ? parseFloat(shop.wallet.pending_balance || 0) : 0;
    const totalEarned = shop.wallet ? parseFloat(shop.wallet.total_earned || 0) : 0;

    result.push({
      shop_id: shop.id,
      shop_name: shop.shop_name,
      shop_logo: shop.shop_logo,
      vendor_name: shop.vendor?.profile?.full_name || "N/A",
      vendor_email: shop.vendor?.email || "",
      bank_name: shop.bank_name,
      bank_account_no: shop.bank_account_no,
      bank_account_name: shop.bank_account_name,
      pending_balance: pendingBalance,
      available_balance: availableBalance,
      total_earned: totalEarned,
      reconciliation_status,
      latest_payout: latestPayout ? {
        id: latestPayout.id,
        amount: parseFloat(latestPayout.amount),
        status: latestPayout.status,
        created_at: latestPayout.created_at,
      } : null,
      rates: { commissionRate, gatewayFee, taxRate },
    });
  }

  return result;
};

const getShopWalletBreakdown = async () => {
  const shops = await db.Shop.findAll({
    where: { status: "APPROVED" },
    attributes: ["id", "shop_name", "shop_logo"],
    include: [
      {
        model: db.ShopWallet,
        as: "wallet"
      }
    ],
    order: [["shop_name", "ASC"]]
  });

  const result = [];
  for (const shop of shops) {
    // Đếm số lượng đơn hàng của shop ở trạng thái giao hàng thành công (DELIVERED hoặc COMPLETED)
    const orders = await db.ShopOrder.findAll({
      where: {
        shop_id: shop.id,
        status: ["DELIVERED", "COMPLETED"]
      }
    });

    const orderCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.final_amount || 0), 0);
    const totalShippingFee = orders.reduce((sum, o) => sum + parseFloat(o.shipping_fee || 0), 0);
    const commissionAmount = orders.reduce((sum, o) => sum + parseFloat(o.commission_amount || 0), 0);

    const availableBalance = shop.wallet ? parseFloat(shop.wallet.balance || 0) : 0;
    const pendingBalance = shop.wallet ? parseFloat(shop.wallet.pending_balance || 0) : 0;

    result.push({
      shop_id: shop.id,
      shop_name: shop.shop_name,
      shop_logo: shop.shop_logo,
      order_count: orderCount,
      total_revenue: totalRevenue,
      total_shipping_fee: totalShippingFee,
      commission_amount: commissionAmount,
      pending_balance: pendingBalance,
      available_balance: availableBalance,
    });
  }
  return result;
};

const disburseShopWallet = async (shopId) => {
  const transaction = await db.sequelize.transaction();
  try {
    const wallet = await db.ShopWallet.findOne({ where: { shop_id: shopId }, transaction });
    if (!wallet) throw new Error("Không tìm thấy ví của shop");

    const pending = parseFloat(wallet.pending_balance || 0);
    if (pending <= 0) {
      throw new Error("Không có số dư đóng băng nào để giải ngân");
    }

    await wallet.update({
      pending_balance: 0,
      balance: parseFloat(wallet.balance || 0) + pending
    }, { transaction });

    await transaction.commit();
    return wallet;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const approveShopPayout = async (adminId, payoutId) => {
  const payout = await db.ShopPayout.findByPk(payoutId);
  if (!payout) throw new Error("Không tìm thấy lệnh thanh toán");
  if (payout.status === "COMPLETED") throw new Error("Lệnh thanh toán đã được duyệt trước đó");

  const transaction = await db.sequelize.transaction();
  try {
    // Cập nhật trạng thái payout
    await payout.update({
      status: "COMPLETED",
      processed_by: adminId,
    }, { transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  // Gửi thông báo cho Vendor & Admin
  try {
    const shop = await db.Shop.findByPk(payout.shop_id);
    if (shop) {
      if (shop.vendor_id) {
        await notificationService.createNotification(
          shop.vendor_id,
          "Lệnh rút tiền đã được duyệt",
          `Lệnh rút tiền trị giá ${Number(payout.amount).toLocaleString()}₫ từ ví gian hàng "${shop.shop_name}" đã được duyệt thành công.`,
          "PAYOUT_STATUS"
        );
      }
      if (adminId) {
        await notificationService.createNotification(
          adminId,
          "Duyệt rút tiền thành công",
          `Bạn đã duyệt thành công lệnh rút tiền trị giá ${Number(payout.amount).toLocaleString()}₫ của gian hàng "${shop.shop_name}".`,
          "PAYOUT_STATUS"
        );
      }
    }
  } catch (notifErr) {
    console.error("Failed to create payout approval notification:", notifErr);
  }

  return payout;
};

// const rejectShopPayout = async (adminId, payoutId, rejectReason) => {
//   const payout = await db.ShopPayout.findByPk(payoutId);
//   if (!payout) throw new Error("Không tìm thấy lệnh thanh toán");
//   if (payout.status === "COMPLETED") throw new Error("Lệnh thanh toán đã hoàn thành, không thể từ chối");
//   if (payout.status === "REJECTED") throw new Error("Lệnh thanh toán đã bị từ chối trước đó");

//   await payout.update({
//     status: "REJECTED",
//     processed_by: adminId,
//     reject_reason: rejectReason || "Không có lý do cụ thể",
//   });

//   // Gửi thông báo cho Vendor & Admin
//   try {
//     const shop = await db.Shop.findByPk(payout.shop_id);
//     if (shop) {
//       if (shop.vendor_id) {
//         await notificationService.createNotification(
//           shop.vendor_id,
//           "Lệnh rút tiền bị từ chối",
//           `Lệnh rút tiền trị giá ${Number(payout.amount).toLocaleString()}₫ từ ví gian hàng "${shop.shop_name}" đã bị từ chối. Lý do: ${rejectReason || "Không có lý do cụ thể"}.`,
//           "PAYOUT_STATUS"
//         );
//       }
//       if (adminId) {
//         await notificationService.createNotification(
//           adminId,
//           "Từ chối rút tiền thành công",
//           `Bạn đã từ chối lệnh rút tiền trị giá ${Number(payout.amount).toLocaleString()}₫ của gian hàng "${shop.shop_name}".`,
//           "PAYOUT_STATUS"
//         );
//       }
//     }
//   } catch (notifErr) {
//     console.error("Failed to create payout rejection notification:", notifErr);
//   }

//   return payout;
// };
const rejectShopPayout = async (processorId, payoutId, reason) => {
  const transaction = await db.sequelize.transaction();
  try {
    const payout = await db.ShopPayout.findByPk(payoutId, { transaction });
    if (!payout) throw new Error("Không tìm thấy lệnh rút tiền");
    if (payout.status !== "PENDING" && payout.status !== "PENDING_APPROVAL" && payout.status !== "PROCESSING") {
      throw new Error("Lệnh rút tiền này đã được xử lý");
    }

    // 1. Cập nhật trạng thái lệnh rút tiền thành REJECTED và lưu lý do
    await payout.update({
      status: "REJECTED",
      processed_by: processorId,
      reject_reason: reason || "Yêu cầu rút tiền bị từ chối"
    }, { transaction });

    // 2. Hoàn lại số dư khả dụng vào ví của Shop
    const wallet = await db.ShopWallet.findOne({ where: { shop_id: payout.shop_id }, transaction });
    if (wallet) {
      const currentBalance = parseFloat(wallet.balance || 0);
      const refundAmount = parseFloat(payout.amount || 0);
      await wallet.update({
        balance: currentBalance + refundAmount
      }, { transaction });
    }

    await transaction.commit();

    // 3. Gửi thông báo cho Vendor khi bị từ chối rút tiền (Lấy từ HEAD)
    try {
      const shop = await db.Shop.findByPk(payout.shop_id);
      if (shop && shop.vendor_id) {
        await notificationService.createNotification(
          shop.vendor_id,
          "Yêu cầu rút tiền bị từ chối",
          `Yêu cầu rút tiền trị giá ${Number(payout.amount).toLocaleString()}₫ của bạn đã bị từ chối. Lý do: ${reason || "Không có lý do cụ thể"}. Số tiền đã được hoàn trả lại vào ví của shop.`,
          "PAYOUT_STATUS"
        );
      }
    } catch (notifErr) {
      console.error("Failed to create payout rejection notification:", notifErr);
    }

    return payout;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};



// ============================================================
// 6. LỊCH SỬ THANH TOÁN (PAYMENT LOGS)
// ============================================================

const getPaymentLogs = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (filters.gateway_name) where.gateway_name = filters.gateway_name;
  if (filters.status) where.status = filters.status;

  if (filters.from_date || filters.to_date) {
    where.transaction_time = {};
    if (filters.from_date) {
      where.transaction_time[Op.gte] = new Date(`${filters.from_date}T00:00:00.000Z`);
    }
    if (filters.to_date) {
      where.transaction_time[Op.lte] = new Date(`${filters.to_date}T23:59:59.999Z`);
    }
  }

  if (filters.search) {
    where[Op.or] = [
      { order_code: { [Op.like]: `%${filters.search}%` } },
      { trans_id: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const { rows, count } = await db.PaymentLog.findAndCountAll({
    where,
    order: [["transaction_time", "DESC"]],
    limit: parseInt(limit),
    offset,
  });

  return {
    logs: rows,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit),
  };
};

const getWithdrawalLogs = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (filters.status) {
    if (filters.status === "PENDING") {
      where.status = { [Op.in]: ["PENDING", "PENDING_APPROVAL"] };
    } else {
      where.status = filters.status;
    }
  }

  if (filters.from_date || filters.to_date) {
    where.created_at = {};
    if (filters.from_date) {
      where.created_at[Op.gte] = new Date(`${filters.from_date}T00:00:00.000Z`);
    }
    if (filters.to_date) {
      where.created_at[Op.lte] = new Date(`${filters.to_date}T23:59:59.999Z`);
    }
  }

  const include = [
    {
      model: db.Shop,
      as: "shop",
      attributes: ["id", "shop_name", "shop_logo"],
      include: [
        {
          model: db.User,
          as: "vendor",
          attributes: ["id", "email", "phone"],
          include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }]
        }
      ]
    },
    {
      model: db.User,
      as: "processor",
      attributes: ["id", "email"],
      include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }]
    }
  ];

  if (filters.search) {
    where[Op.or] = [
      { bank_account: { [Op.like]: `%${filters.search}%` } },
      { '$shop.shop_name$': { [Op.like]: `%${filters.search}%` } }
    ];
  }

  const { rows, count } = await db.ShopPayout.findAndCountAll({
    where,
    include,
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
  });

  return {
    logs: rows,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit),
  };
};

const getOrderByCode = async (checkoutCode) => {
  const parentOrder = await db.ParentOrder.findOne({
    where: { checkout_code: checkoutCode },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "email", "phone"],
        include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }]
      },
      {
        model: db.ShopOrder,
        as: "shopOrders",
        include: [
          {
            model: db.Shop,
            as: "shop",
            attributes: ["id", "shop_name", "shop_logo"]
          },
          {
            model: db.OrderItem,
            as: "items",
          }
        ]
      }
    ]
  });

  if (!parentOrder) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  return parentOrder;
};

const getPendingShipperReconciliations = async () => {
  const role = await db.Role.findOne({ where: { role_name: "shipper" } });
  if (!role) return [];

  const shippers = await db.User.findAll({
    where: { role_id: role.id },
    include: [
      {
        model: db.UserProfile,
        as: "profile",
        attributes: ["full_name"]
      }
    ],
    attributes: ["id", "email", "phone", "status"]
  });

  const overview = [];

  for (const shipper of shippers) {
    // Count total orders assigned
    const totalOrders = await db.ShopOrder.count({
      where: { shipper_id: shipper.id }
    });

    // Count delivered orders
    const deliveredOrders = await db.ShopOrder.count({
      where: { shipper_id: shipper.id, status: "DELIVERED" }
    });

    // Get orders that are HELD_BY_SHIPPER
    const heldOrders = await db.ShopOrder.findAll({
      where: {
        shipper_id: shipper.id,
        cod_status: "HELD_BY_SHIPPER"
      },
      include: [
        {
          model: db.ParentOrder,
          as: "parentOrder",
          where: { payment_method: "COD" },
          attributes: ["id", "checkout_code", "payment_method", "shipping_address"]
        }
      ],
      attributes: ["id", "shop_order_code", "cod_amount_collected", "final_amount", "subtotal", "discount_amount", "commission_amount", "created_at"]
    });

    const totalHeldAmount = heldOrders.reduce((sum, o) => sum + Number(o.cod_amount_collected || o.final_amount), 0);

    // Only include in overview if they have assigned orders or are holding cash
    if (totalOrders > 0 || totalHeldAmount > 0) {
      overview.push({
        id: shipper.id, // map id to shipper's ID for routing
        shipper: {
          id: shipper.id,
          email: shipper.email,
          phone: shipper.phone,
          status: shipper.status,
          full_name: shipper.profile?.full_name || "Chưa cập nhật"
        },
        totalOrders,
        deliveredOrders,
        totalHeldAmount,
        heldOrders
      });
    }
  }

  return overview;
};

const approveShipperReconciliation = async (processorId, shipperId) => {
  const transaction = await db.sequelize.transaction();
  try {
    // 1. Find all COD orders held by this shipper
    const orders = await db.ShopOrder.findAll({
      where: {
        shipper_id: shipperId,
        cod_status: "HELD_BY_SHIPPER"
      },
      include: [
        {
          model: db.ParentOrder,
          as: "parentOrder",
          where: { payment_method: "COD" }
        }
      ],
      transaction
    });

    if (orders.length === 0) {
      throw new Error("Shipper không giữ tiền mặt thu hộ nào cần đối soát");
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.cod_amount_collected || o.final_amount), 0);

    // 2. Create a ShipperReconciliation record with status APPROVED for audit trail
    const recon = await db.ShipperReconciliation.create({
      shipper_id: shipperId,
      amount_submitted: totalAmount,
      status: "APPROVED",
      confirmed_by: processorId,
      note: "Đã nộp tiền mặt đối soát thành công (hệ thống tự động)"
    }, { transaction });

    // 3. Update orders
    for (const order of orders) {
      await order.update({
        cod_status: "CONFIRMED",
        shipper_reconciliation_id: recon.id
      }, { transaction });
    }

    await transaction.commit();
    return recon;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const rejectShipperReconciliation = async (processorId, shipperId, reason) => {
  const transaction = await db.sequelize.transaction();
  try {
    // 1. Find all COD orders held by this shipper
    const orders = await db.ShopOrder.findAll({
      where: {
        shipper_id: shipperId,
        cod_status: "HELD_BY_SHIPPER"
      },
      include: [
        {
          model: db.ParentOrder,
          as: "parentOrder",
          where: { payment_method: "COD" }
        }
      ],
      transaction
    });

    if (orders.length === 0) {
      throw new Error("Shipper không giữ tiền mặt thu hộ nào cần từ chối");
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.cod_amount_collected || o.final_amount), 0);

    // 2. Create a ShipperReconciliation record with status REJECTED for audit trail
    const recon = await db.ShipperReconciliation.create({
      shipper_id: shipperId,
      amount_submitted: totalAmount,
      status: "REJECTED",
      confirmed_by: processorId,
      note: reason || "Từ chối đối soát do thiếu tiền"
    }, { transaction });

    // 3. Update orders
    for (const order of orders) {
      await order.update({
        cod_status: "MISMATCH",
        shipper_reconciliation_id: recon.id
      }, { transaction });
    }

    // 4. Lock shipper account
    const shipperUser = await db.User.findByPk(shipperId, { transaction });
    if (shipperUser) {
      await shipperUser.update({ status: "LOCKED" }, { transaction });
    }

    await transaction.commit();
    return recon;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// const rejectShopPayout = async (processorId, payoutId, reason) => {
//   const transaction = await db.sequelize.transaction();
//   try {
//     const payout = await db.ShopPayout.findByPk(payoutId, { transaction });
//     if (!payout) throw new Error("Không tìm thấy lệnh rút tiền");
//     if (payout.status !== "PENDING" && payout.status !== "PROCESSING") {
//       throw new Error("Lệnh rút tiền này đã được xử lý");
//     }

//     await payout.update({
//       status: "REJECTED",
//       processed_by: processorId,
//       reject_reason: reason || "Yêu cầu rút tiền bị từ chối"
//     }, { transaction });

//     // Refund money back to shop wallet balance
//     const wallet = await db.ShopWallet.findOne({ where: { shop_id: payout.shop_id }, transaction });
//     if (wallet) {
//       await wallet.increment('balance', { by: payout.amount, transaction });
//     }

//     await transaction.commit();
//     return payout;
//   } catch (error) {
//     await transaction.rollback();
//     throw error;
//   }
// };

export default {
  // Manager
  // Users
  createUser,
  getUsersByRole,
  updateUserProfileByAdmin,
  lockUser,
  unlockUser,
  // Shops
  getAllShops,
  getPendingShops,
  approveShop,
  rejectShop,
  // Settings
  getSystemSettings,
  updateSystemSetting,
  // Categories
  getCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  // Financial
  getFinancialReport,
  // Reconciliation
  getPaymentReconciliation,
  getShopWalletBreakdown,
  disburseShopWallet,
  approveShopPayout,
  rejectShopPayout,

  getPendingShipperReconciliations,
  approveShipperReconciliation,
  rejectShipperReconciliation,

  // Payment Logs
  getPaymentLogs,
  getWithdrawalLogs,
  // Orders
  getOrderByCode,
};

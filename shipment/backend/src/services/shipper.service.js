import db from "../../../Ecommerce-platform/backend/src/database/models/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "fashion_marketplace_access_token_secret_key_2026";

const login = async (emailOrPhone, password) => {
  if (!emailOrPhone || !password) {
    throw new Error("Vui lòng nhập email/số điện thoại và mật khẩu");
  }

  const user = await db.User.findOne({
    where: {
      [db.Sequelize.Op.or]: [
        { email: emailOrPhone },
        { phone: emailOrPhone }
      ]
    },
    include: [
      { model: db.Role, as: "role" },
      { model: db.UserProfile, as: "profile" }
    ]
  });

  if (!user) {
    throw new Error("Tài khoản không tồn tại");
  }

  const roleName = user.role?.role_name?.toLowerCase();
  if (roleName !== "shipper" && roleName !== "admin") {
    throw new Error("Tài khoản không có quyền truy cập hệ thống giao hàng (Shipper Portal)");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    // In dev environment, check if plaintext matches (some test seeders)
    if (password !== user.password_hash) {
      throw new Error("Mật khẩu không chính xác");
    }
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: roleName,
    role_id: user.role_id,
  };

  const accessToken = jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  const userData = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role?.role_name,
    full_name: user.profile?.full_name || user.email.split("@")[0],
    avatar_url: user.profile?.avatar_url || null,
    date_of_birth: user.profile?.date_of_birth || null,
    gender: user.profile?.gender || null,
    operating_areas: (() => {
      const raw = user.profile?.operating_areas;
      if (Array.isArray(raw)) return raw;
      try {
        if (typeof raw === "string") return JSON.parse(raw);
      } catch (e) {}
      return [];
    })(),
  };

  return { user: userData, accessToken };
};

const getShipperProfile = async (shipperId) => {
  const user = await db.User.findByPk(shipperId, {
    include: [
      { model: db.Role, as: "role" },
      { model: db.UserProfile, as: "profile" }
    ]
  });

  if (!user) {
    throw new Error("Không tìm thấy thông tin tài khoản");
  }

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role?.role_name,
    full_name: user.profile?.full_name || "",
    avatar_url: user.profile?.avatar_url || null,
    date_of_birth: user.profile?.date_of_birth || null,
    gender: user.profile?.gender || "male",
    operating_areas: (() => {
      const raw = user.profile?.operating_areas;
      if (Array.isArray(raw)) return raw;
      try {
        if (typeof raw === "string") return JSON.parse(raw);
      } catch (e) {}
      return [];
    })(),
  };
};

const updateShipperProfile = async (shipperId, data) => {
  const user = await db.User.findByPk(shipperId, {
    include: [{ model: db.UserProfile, as: "profile" }]
  });

  if (!user) {
    throw new Error("Không tìm thấy tài khoản");
  }

  const transaction = await db.sequelize.transaction();
  try {
    if (data.phone) {
      await user.update({ phone: data.phone }, { transaction });
    }

    const profileData = {};
    if (data.full_name !== undefined) profileData.full_name = data.full_name;
    if (data.date_of_birth !== undefined) profileData.date_of_birth = data.date_of_birth;
    if (data.gender !== undefined) profileData.gender = data.gender;
    if (data.avatar_url !== undefined) profileData.avatar_url = data.avatar_url;
    if (data.operating_areas !== undefined) {
      profileData.operating_areas = Array.isArray(data.operating_areas)
        ? JSON.stringify(data.operating_areas)
        : data.operating_areas;
    }

    if (user.profile) {
      await user.profile.update(profileData, { transaction });
    } else {
      await db.UserProfile.create({
        user_id: user.id,
        ...profileData
      }, { transaction });
    }

    await transaction.commit();
    return await getShipperProfile(shipperId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getShipperOrders = async (shipperId, { page = 1, limit = 50, status, search }) => {
  const where = {};

  if (status) {
    if (status === 'SHIPPING' || status === 'PENDING_PICKUP') {
      where[db.Sequelize.Op.and] = [
        { status },
        {
          [db.Sequelize.Op.or]: [
            { shipper_id: null },
            { shipper_id: shipperId }
          ]
        }
      ];
    } else {
      where.status = status;
      where.shipper_id = shipperId;
    }
  } else {
    where[db.Sequelize.Op.or] = [
      {
        status: { [db.Sequelize.Op.in]: ['SHIPPING', 'PENDING_PICKUP'] },
        shipper_id: null
      },
      {
        shipper_id: shipperId
      }
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await db.ShopOrder.findAndCountAll({
    where,
    include: [
      {
        model: db.Shipment,
        as: "shipment",
        include: [{ model: db.ShipmentHistory, as: "histories" }]
      },
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
        attributes: ['id', 'shipping_address', 'payment_method', 'payment_status', 'user_id', 'note', 'checkout_code']
      }
    ],
    order: [["updated_at", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  let orders = rows;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    orders = orders.filter((o) => {
      const codeMatch = o.shop_order_code?.toLowerCase().includes(q);
      const trackingMatch = o.shipment?.tracking_number?.toLowerCase().includes(q);
      const addressMatch = JSON.stringify(o.parentOrder?.shipping_address || "").toLowerCase().includes(q);
      return codeMatch || trackingMatch || addressMatch;
    });
  }

  return {
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    orders,
  };
};

const getCollectedCOD = async (shipperId) => {
  return await db.ShopOrder.findAll({
    where: {
      shipper_id: shipperId,
      cod_status: "HELD_BY_SHIPPER"
    },
    include: [
      {
        model: db.ParentOrder,
        as: "parentOrder",
        where: { payment_method: "COD" },
        attributes: ["id", "checkout_code", "payment_method", "shipping_address"]
      },
      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name"]
      }
    ],
    order: [["updated_at", "DESC"]]
  });
};

const submitCODReconciliation = async (shipperId, orderIds, note = null) => {
  if (!orderIds || orderIds.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một đơn hàng để đối soát");
  }

  const transaction = await db.sequelize.transaction();
  try {
    const orders = await db.ShopOrder.findAll({
      where: {
        id: orderIds,
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

    if (orders.length !== orderIds.length) {
      throw new Error("Một số đơn hàng đã chọn không hợp lệ hoặc đã được đối soát trước đó");
    }

    let totalSum = 0;
    orders.forEach(order => {
      totalSum += Number(order.cod_amount_collected || 0);
    });

    const recon = await db.ShipperReconciliation.create({
      shipper_id: shipperId,
      amount_submitted: totalSum,
      status: "PENDING",
      note: note
    }, { transaction });

    await db.ShopOrder.update(
      {
        cod_status: "SUBMITTED",
        shipper_reconciliation_id: recon.id
      },
      {
        where: { id: orderIds },
        transaction
      }
    );

    await transaction.commit();
    return recon;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getReconciliationHistory = async (shipperId) => {
  return await db.ShipperReconciliation.findAll({
    where: { shipper_id: shipperId },
    include: [
      {
        model: db.ShopOrder,
        as: "orders",
        attributes: ["id", "shop_order_code", "final_amount", "cod_amount_collected", "updated_at"]
      }
    ],
    order: [["created_at", "DESC"]]
  });
};

export default {
  login,
  getShipperProfile,
  updateShipperProfile,
  getShipperOrders,
  getCollectedCOD,
  submitCODReconciliation,
  getReconciliationHistory,
};

import db from "../../database/models/index.js";

const getUserProfileById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let userAccount = await db.User.findByPk(id, {
        attributes: ["loyalty_points", "email", "phone", "role_id"],
        include: [
          { model: db.Role, as: "role", attributes: ["role_name"] },
          { model: db.UserProfile, as: "profile" }
        ],
      });
      
      if (userAccount) {
        let userProfile = userAccount.profile ? userAccount.profile.toJSON() : {};
        resolve({
          ...userProfile,
          loyalty_points: userAccount.loyalty_points,
          email: userAccount.email,
          phone: userAccount.phone,
          role_id: userAccount.role_id,
          role: userAccount.role ? userAccount.role.role_name : null,
        });
      } else {
        resolve(null);
      }
    } catch (error) {
      reject(error);
    }
  });
};

const updateUserProfile = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("data.user_id:", data.user_id);
      
      // Update User table for phone number
      if (data.phone !== undefined) {
        let userAccount = await db.User.findByPk(data.user_id);
        if (userAccount) {
          await userAccount.update({ phone: data.phone || null });
        }
      }

      let userProfile = await db.UserProfile.findOne({
        where: { user_id: data.user_id },
      });
      if (userProfile) {
        await userProfile.update({
          full_name: data.full_name,
          birthday: data.date_of_birth || null,
          gender: data.gender,
          avatar_url: data.avatar_url || userProfile.avatar_url,
          shipper_shop_id: data.shipper_shop_id !== undefined ? (data.shipper_shop_id || null) : userProfile.shipper_shop_id,
          operating_areas: data.operating_areas !== undefined ? data.operating_areas : userProfile.operating_areas,
        });
        
        userProfile.dataValues.phone = data.phone; // Attach phone to response
        resolve(userProfile);
      } else {
        // If not found, create one
        userProfile = await db.UserProfile.create({
          user_id: data.user_id,
          full_name: data.full_name,
          birthday: data.date_of_birth || null,
          gender: data.gender,
          avatar_url: data.avatar_url || null,
          shipper_shop_id: data.shipper_shop_id || null,
          operating_areas: data.operating_areas || null,
        });
        
        userProfile.dataValues.phone = data.phone; // Attach phone to response
        resolve(userProfile);
      }
    } catch (error) {
      reject(error);
    }
  });
};

const getFavorites = async (userId) => {
  return await db.Wishlist.findAll({
    where: { user_id: userId },
    include: [
      {
        model: db.Product,
        as: "product",
        include: [
          {
            model: db.ProductImage,
            as: "images",
            where: { is_primary: true },
            required: false,
          }
        ]
      }
    ],
    order: [["added_at", "DESC"]],
  });
};

const getViewedProducts = async (userId) => {
  return await db.UserViewedProduct.findAll({
    where: { user_id: userId },
    include: [
      {
        model: db.Product,
        as: "product",
        include: [
          {
            model: db.ProductImage,
            as: "images",
            where: { is_primary: true },
            required: false,
          }
        ]
      }
    ],
    order: [["viewed_at", "DESC"]],
    limit: 20,
  });
};

export default {
  getUserProfileById,
  updateUserProfile,
  getFavorites,
  getViewedProducts,
};

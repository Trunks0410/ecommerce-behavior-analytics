import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
      User.hasOne(models.UserProfile, { foreignKey: "user_id", as: "profile" });
      User.hasOne(models.Shop, { foreignKey: "vendor_id", as: "shop" });
      User.hasMany(models.UserAddress, { foreignKey: "user_id", as: "addresses" });
      User.hasMany(models.ParentOrder, { foreignKey: "user_id", as: "orders" });
      User.hasMany(models.CartItem, { foreignKey: "user_id", as: "cartItems" });
      User.hasMany(models.Wishlist, { foreignKey: "user_id", as: "wishlist" });
      User.hasMany(models.ProductReview, { foreignKey: "user_id", as: "reviews" });
      User.hasMany(models.Conversation, { foreignKey: "user_id", as: "conversations" });
      User.hasMany(models.Message, { foreignKey: "sender_id", as: "messages" });
      User.hasMany(models.ReturnRequest, { foreignKey: "user_id", as: "returnRequests" });
      User.hasMany(models.Notification, { foreignKey: "user_id", as: "notifications" });
      User.hasMany(models.UserCoupon, { foreignKey: "user_id", as: "savedCoupons" });
    }
  }

  User.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
      phone: { type: DataTypes.STRING(20), allowNull: true, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: true },
      role_id: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.ENUM("PENDING", "ACTIVE", "LOCKED"), allowNull: false, defaultValue: "PENDING" },
      // Optional extra fields that might break app if removed (but are not in schema.sql)
      auth_provider: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "local" },
      auth_provider_id: { type: DataTypes.STRING(255), allowNull: true },
      loyalty_points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return User;
};

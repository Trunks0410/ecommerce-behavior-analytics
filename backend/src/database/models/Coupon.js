import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Coupon extends Model {
    static associate(models) {
      Coupon.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
      Coupon.hasMany(models.ParentOrder, { foreignKey: "platform_coupon_id", as: "platformOrders" });
      Coupon.hasMany(models.ShopOrder, { foreignKey: "shop_coupon_id", as: "shopOrders" });
      Coupon.belongsTo(models.Category, { foreignKey: "category_id", as: "category" });
      Coupon.hasMany(models.UserCoupon, { foreignKey: "coupon_id", as: "savedByUsers" });
    }
  }

  Coupon.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_id: { type: DataTypes.BIGINT, allowNull: true },
      category_id: { type: DataTypes.BIGINT, allowNull: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      discount_type: { type: DataTypes.ENUM("PERCENT", "FIXED"), allowNull: false },
      discount_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      max_discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      min_order_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      usage_limit: { type: DataTypes.INTEGER, allowNull: true },
      used_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      start_date: { type: DataTypes.DATE, allowNull: false },
      end_date: { type: DataTypes.DATE, allowNull: false },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "Coupon",
      tableName: "coupons",
      timestamps: true,
      createdAt: false,
      updatedAt: false,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return Coupon;
};

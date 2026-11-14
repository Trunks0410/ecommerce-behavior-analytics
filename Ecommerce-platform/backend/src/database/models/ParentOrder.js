import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ParentOrder extends Model {
    static associate(models) {
      ParentOrder.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      ParentOrder.belongsTo(models.Coupon, { foreignKey: "platform_coupon_id", as: "platformCoupon" });
      ParentOrder.hasMany(models.ShopOrder, { foreignKey: "parent_order_id", as: "shopOrders" });
    }
  }

  ParentOrder.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      address_id: { type: DataTypes.BIGINT, allowNull: true },
      checkout_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      payment_method: { type: DataTypes.ENUM("COD", "VNPAY", "MOMO", "CREDIT_CARD"), allowNull: false },
      payment_status: { type: DataTypes.ENUM("UNPAID", "PAID", "REFUNDED"), allowNull: false, defaultValue: "UNPAID" },
      shipping_address: { type: DataTypes.TEXT, allowNull: false },
      platform_coupon_id: { type: DataTypes.BIGINT, allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ParentOrder",
      tableName: "parent_orders",
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ParentOrder;
};

import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ShopOrder extends Model {
    static associate(models) {
      ShopOrder.belongsTo(models.ParentOrder, { foreignKey: "parent_order_id", as: "parentOrder" });
      ShopOrder.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
      ShopOrder.belongsTo(models.User, { foreignKey: "shipper_id", as: "shipper" });
      ShopOrder.belongsTo(models.Coupon, { foreignKey: "shop_coupon_id", as: "shopCoupon" });
      ShopOrder.belongsTo(models.ShipperReconciliation, { foreignKey: "shipper_reconciliation_id", as: "reconciliation" });
      ShopOrder.hasMany(models.OrderItem, { foreignKey: "shop_order_id", as: "items" });
      ShopOrder.hasMany(models.ShopOrderStatusHistory, { foreignKey: "shop_order_id", as: "statusHistory" });
      ShopOrder.hasMany(models.ProductReview, { foreignKey: "shop_order_id", as: "reviews" });
      ShopOrder.hasMany(models.ReturnRequest, { foreignKey: "shop_order_id", as: "returnRequests" });
      ShopOrder.hasOne(models.Shipment, { foreignKey: "shop_order_id", as: "shipment" });
    }
  }

  ShopOrder.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      parent_order_id: { type: DataTypes.BIGINT, allowNull: false },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
      shipper_id: { type: DataTypes.BIGINT, allowNull: true },
      shop_order_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      shipping_fee: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      discount_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      final_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      commission_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 10.0 },
      commission_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      cod_amount_collected: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      cod_status: {
        type: DataTypes.ENUM("NOT_COD", "HELD_BY_SHIPPER", "SUBMITTED", "CONFIRMED", "MISMATCH"),
        allowNull: false,
        defaultValue: "NOT_COD",
      },
      shipper_reconciliation_id: { type: DataTypes.BIGINT, allowNull: true },
      shop_coupon_id: { type: DataTypes.BIGINT, allowNull: true },
      points_used: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      points_earned: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(
          "PENDING", "CONFIRMED", "PREPARING", "SHIPPING",
          "DELIVERED", "COMPLETED", "CANCEL_REQUESTED", "CANCELLED", "FAILED",
          "RETURN_PENDING", "RETURNED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      delivery_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "ShopOrder",
      tableName: "shop_orders",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ShopOrder;
};

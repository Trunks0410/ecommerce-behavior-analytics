import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Shipment extends Model {
    static associate(models) {
      Shipment.belongsTo(models.ShopOrder, { foreignKey: "shop_order_id", as: "shopOrder" });
      Shipment.belongsTo(models.User, { foreignKey: "shipper_id", as: "shipper" });
      Shipment.hasMany(models.ShipmentHistory, { foreignKey: "shipment_id", as: "histories" });
    }
  }

  Shipment.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_order_id: { type: DataTypes.BIGINT, allowNull: false },
      shipper_id: { type: DataTypes.BIGINT, allowNull: true },
      tracking_number: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      status: {
        type: DataTypes.ENUM(
          'PENDING_PICKUP',
          'PICKED_UP',
          'IN_TRANSIT',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'FAILED',
          'RETURNED'
        ),
        defaultValue: 'PENDING_PICKUP',
      },
      shipping_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      estimated_delivery_date: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "Shipment",
      tableName: "shipments",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Shipment;
};

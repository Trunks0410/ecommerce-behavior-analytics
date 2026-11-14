import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      OrderItem.belongsTo(models.ShopOrder, { foreignKey: "shop_order_id", as: "shopOrder" });
      OrderItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id", as: "variant" });
    }
  }

  OrderItem.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_order_id: { type: DataTypes.BIGINT, allowNull: false },
      variant_id: { type: DataTypes.BIGINT, allowNull: false },
      product_name: { type: DataTypes.STRING(300), allowNull: false },
      sku: { type: DataTypes.STRING(100), allowNull: false },
      size: { type: DataTypes.STRING(20), allowNull: false },
      color: { type: DataTypes.STRING(50), allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    },
    {
      sequelize,
      modelName: "OrderItem",
      tableName: "order_items",
      timestamps: false,
    }
  );

  return OrderItem;
};

import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ShopOrderStatusHistory extends Model {
    static associate(models) {
      ShopOrderStatusHistory.belongsTo(models.ShopOrder, { foreignKey: "shop_order_id", as: "shopOrder" });
      ShopOrderStatusHistory.belongsTo(models.User, { foreignKey: "changed_by", as: "changer" });
    }
  }

  ShopOrderStatusHistory.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_order_id: { type: DataTypes.BIGINT, allowNull: false },
      old_status: { type: DataTypes.STRING(30), allowNull: true },
      new_status: { type: DataTypes.STRING(30), allowNull: false },
      note: { type: DataTypes.STRING(255), allowNull: true },
      changed_by: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ShopOrderStatusHistory",
      tableName: "shop_order_status_history",
      createdAt: "changed_at",
      updatedAt: false,
    }
  );

  return ShopOrderStatusHistory;
};

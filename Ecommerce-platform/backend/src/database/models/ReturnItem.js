import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ReturnItem extends Model {
    static associate(models) {
      ReturnItem.belongsTo(models.ReturnRequest, { foreignKey: "return_request_id", as: "returnRequest" });
      ReturnItem.belongsTo(models.OrderItem, { foreignKey: "order_item_id", as: "orderItem" });
    }
  }

  ReturnItem.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      return_request_id: { type: DataTypes.BIGINT, allowNull: false },
      order_item_id: { type: DataTypes.BIGINT, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: true },
      serial_number: { type: DataTypes.STRING(100), allowNull: true },
      condition_note: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: "ReturnItem",
      tableName: "return_items",
      timestamps: false,
    }
  );

  return ReturnItem;
};

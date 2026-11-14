import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ReturnRequest extends Model {
    static associate(models) {
      ReturnRequest.belongsTo(models.ShopOrder, { foreignKey: "shop_order_id", as: "shopOrder" });
      ReturnRequest.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      ReturnRequest.belongsTo(models.User, { foreignKey: "resolved_by", as: "resolver" });
      ReturnRequest.hasMany(models.ReturnItem, { foreignKey: "return_request_id", as: "items" });
    }
  }

  ReturnRequest.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_order_id: { type: DataTypes.BIGINT, allowNull: false },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: false },
      evidence_urls: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED_BY_SHOP", "RESOLVED_BY_ADMIN", "REJECTED", "COMPLETED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      resolved_by: { type: DataTypes.BIGINT, allowNull: true },
      resolve_note: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ReturnRequest",
      tableName: "return_requests",
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ReturnRequest;
};

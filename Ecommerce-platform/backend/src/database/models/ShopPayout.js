import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ShopPayout extends Model {
    static associate(models) {
      ShopPayout.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
      ShopPayout.belongsTo(models.User, { foreignKey: "processed_by", as: "processor" });
    }
  }

  ShopPayout.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      bank_name: { type: DataTypes.STRING(100), allowNull: true },
      bank_account: { type: DataTypes.STRING(255), allowNull: false },
      bank_account_name: { type: DataTypes.STRING(200), allowNull: true },
      status: { type: DataTypes.ENUM("PENDING", "PENDING_APPROVAL", "PROCESSING", "COMPLETED", "REJECTED"), allowNull: false, defaultValue: "PENDING" },
      processed_by: { type: DataTypes.BIGINT, allowNull: true },
      reject_reason: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: "ShopPayout",
      tableName: "shop_payouts",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ShopPayout;
};

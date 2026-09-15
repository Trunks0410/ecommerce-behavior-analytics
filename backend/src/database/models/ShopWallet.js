import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ShopWallet extends Model {
    static associate(models) {
      ShopWallet.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
    }
  }

  ShopWallet.init(
    {
      shop_id: { type: DataTypes.BIGINT, primaryKey: true, allowNull: false },
      balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      pending_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      total_earned: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "ShopWallet",
      tableName: "shop_wallets",
      timestamps: false,
    }
  );

  return ShopWallet;
};

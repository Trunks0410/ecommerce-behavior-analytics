import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Shop extends Model {
    static associate(models) {
      Shop.belongsTo(models.User, { foreignKey: "vendor_id", as: "vendor" });
      Shop.hasMany(models.Product, { foreignKey: "shop_id", as: "products" });
      Shop.hasMany(models.Coupon, { foreignKey: "shop_id", as: "coupons" });
      Shop.hasMany(models.ShopOrder, { foreignKey: "shop_id", as: "orders" });
      Shop.hasOne(models.ShopWallet, { foreignKey: "shop_id", as: "wallet" });
      Shop.hasMany(models.ShopPayout, { foreignKey: "shop_id", as: "payouts" });
      Shop.hasMany(models.PlatformCommission, { foreignKey: "shop_id", as: "commissions" });
      Shop.hasMany(models.Conversation, { foreignKey: "shop_id", as: "conversations" });
    }
  }

  Shop.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      vendor_id: { type: DataTypes.BIGINT, allowNull: false },
      shop_name: { type: DataTypes.STRING(200), allowNull: false, unique: true },
      shop_logo: { type: DataTypes.TEXT, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "BANNED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      rating: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0.0 },
      bank_name: { type: DataTypes.STRING(100), allowNull: true },
      bank_account_no: { type: DataTypes.STRING(50), allowNull: true },
      bank_account_name: { type: DataTypes.STRING(200), allowNull: true },
    },
    {
      sequelize,
      modelName: "Shop",
      tableName: "shops",
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return Shop;
};

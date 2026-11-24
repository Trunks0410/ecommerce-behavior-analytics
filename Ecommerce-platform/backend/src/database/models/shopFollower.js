import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class ShopFollower extends Model {
    static associate(models) {
      ShopFollower.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      ShopFollower.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
    }
  }

  ShopFollower.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
    },
    {
      sequelize,
      modelName: "ShopFollower",
      tableName: "shop_followers",
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "shop_id"],
        },
      ],
    }
  );

  return ShopFollower;
};

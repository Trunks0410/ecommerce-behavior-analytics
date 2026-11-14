import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class UserViewedProduct extends Model {
    static associate(models) {
      UserViewedProduct.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      UserViewedProduct.belongsTo(models.Product, { foreignKey: "product_id", as: "product" });
    }
  }

  UserViewedProduct.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      product_id: { type: DataTypes.BIGINT, allowNull: false },
      viewed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "UserViewedProduct",
      tableName: "user_viewed_products",
      timestamps: false,
    }
  );

  return UserViewedProduct;
};

import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Wishlist extends Model {
    static associate(models) {
      Wishlist.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      Wishlist.belongsTo(models.Product, { foreignKey: "product_id", as: "product" });
    }
  }

  Wishlist.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      product_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Wishlist",
      tableName: "wishlists",
      createdAt: "added_at",
      updatedAt: false,
    }
  );

  return Wishlist;
};

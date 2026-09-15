import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      CartItem.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      CartItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id", as: "variant" });
    }
  }

  CartItem.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      variant_id: { type: DataTypes.BIGINT, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      sequelize,
      modelName: "CartItem",
      tableName: "cart_items",
      createdAt: "added_at",
      updatedAt: false,
    }
  );

  return CartItem;
};

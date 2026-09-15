import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ProductReview extends Model {
    static associate(models) {
      ProductReview.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      ProductReview.belongsTo(models.Product, { foreignKey: "product_id", as: "product" });
      ProductReview.belongsTo(models.ShopOrder, { foreignKey: "shop_order_id", as: "shopOrder" });
    }
  }

  ProductReview.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.BIGINT, allowNull: false },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      shop_order_id: { type: DataTypes.BIGINT, allowNull: false },
      rating: { 
        type: DataTypes.TINYINT, 
        allowNull: false,
        validate: { min: 1, max: 5 }
      },
      comment: { type: DataTypes.TEXT, allowNull: true },
      vendor_reply: { type: DataTypes.TEXT, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "ProductReview",
      tableName: "product_reviews",
      createdAt: "created_at",
      updatedAt: false,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return ProductReview;
};

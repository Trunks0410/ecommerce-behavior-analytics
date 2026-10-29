import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      Product.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
      Product.belongsTo(models.Category, { foreignKey: "category_id", as: "category" });
      Product.hasMany(models.ProductImage, { foreignKey: "product_id", as: "images" });
      Product.hasMany(models.ProductVariant, { foreignKey: "product_id", as: "variants" });
      Product.hasMany(models.ProductReview, { foreignKey: "product_id", as: "reviews" });
      Product.hasMany(models.Wishlist, { foreignKey: "product_id", as: "wishlistedBy" });
    }
  }

  Product.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
      category_id: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING(300), allowNull: false },
      slug: { type: DataTypes.STRING(350), unique: true, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      price: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      sale_price: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      sold_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      view_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_new: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      gender: { type: DataTypes.ENUM("MALE", "FEMALE", "UNISEX"), allowNull: false, defaultValue: "UNISEX" },
      material: { type: DataTypes.STRING(100), allowNull: true },
      approval_status: { 
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "HIDDEN"), 
        allowNull: false, 
        defaultValue: "PENDING" 
      },
    },
    {
      sequelize,
      modelName: "Product",
      tableName: "products",
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return Product;
};

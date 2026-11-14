import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ProductVariant extends Model {
    static associate(models) {
      ProductVariant.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });
      ProductVariant.hasMany(models.OrderItem, {
        foreignKey: "variant_id",
        as: "orderItems",
      });
      ProductVariant.hasMany(models.CartItem, {
        foreignKey: "variant_id",
        as: "cartItems",
      });
      ProductVariant.hasMany(models.CampaignProduct, {
        foreignKey: "variant_id",
        as: "campaigns",
      });
    }
  }

  ProductVariant.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.BIGINT, allowNull: false },
      sku: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      size: { type: DataTypes.STRING(20), allowNull: false },
      color: { type: DataTypes.STRING(50), allowNull: false },
      color_hex: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "#888888" },
      image_url: { type: DataTypes.TEXT, allowNull: true },
      price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      sale_price: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "ProductVariant",
      tableName: "product_variants",
      timestamps: true,
      createdAt: false,
      updatedAt: false,
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  return ProductVariant;
};

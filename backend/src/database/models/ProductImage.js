import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ProductImage extends Model {
    static associate(models) {
      ProductImage.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });
    }
  }

  ProductImage.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.BIGINT, allowNull: false },
      image_url: { type: DataTypes.TEXT, allowNull: false },
      alt_text: { type: DataTypes.STRING(200), allowNull: true },
      sort_order: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
      is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: "ProductImage",
      tableName: "product_images",
      timestamps: false,
    }
  );

  return ProductImage;
};

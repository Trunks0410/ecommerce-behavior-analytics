import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class CampaignProduct extends Model {
    static associate(models) {
      CampaignProduct.belongsTo(models.Campaign, { foreignKey: "campaign_id", as: "campaign" });
      CampaignProduct.belongsTo(models.ProductVariant, { foreignKey: "variant_id", as: "variant" });
    }
  }

  CampaignProduct.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      campaign_id: { type: DataTypes.BIGINT, allowNull: false },
      variant_id: { type: DataTypes.BIGINT, allowNull: false },
      sale_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      quantity_limit: { type: DataTypes.INTEGER, allowNull: true },
      sold_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      approval_status: { type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"), allowNull: false, defaultValue: "PENDING" },
    },
    {
      sequelize,
      modelName: "CampaignProduct",
      tableName: "campaign_products",
      timestamps: false,
    }
  );

  return CampaignProduct;
};

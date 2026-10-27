import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Campaign extends Model {
    static associate(models) {
      Campaign.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
      Campaign.hasMany(models.CampaignProduct, { foreignKey: "campaign_id", as: "products" });
      Campaign.hasMany(models.Banner, { foreignKey: "campaign_id", as: "banners" });
    }
  }

  Campaign.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      type: { type: DataTypes.ENUM("FLASH_SALE", "SEASONAL", "VOUCHER_RAIN", "OTHER"), allowNull: false, defaultValue: "OTHER" },
      description: { type: DataTypes.TEXT, allowNull: true },
      discount_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE, allowNull: false },
      status: { type: DataTypes.ENUM("DRAFT", "ACTIVE", "ENDED", "CANCELLED"), allowNull: false, defaultValue: "DRAFT" },
      created_by: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      sequelize,
      modelName: "Campaign",
      tableName: "campaigns",
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Campaign;
};

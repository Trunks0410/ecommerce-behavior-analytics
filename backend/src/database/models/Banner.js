import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Banner extends Model {
    static associate(models) {
      Banner.belongsTo(models.Campaign, { foreignKey: "campaign_id", as: "campaign" });
      Banner.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
    }
  }

  Banner.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.STRING(200), allowNull: true },
      image_url: { type: DataTypes.TEXT, allowNull: false },
      link_url: { type: DataTypes.TEXT, allowNull: true },
      position: { type: DataTypes.ENUM("HOME_TOP", "HOME_MID", "CATEGORY_TOP", "SIDEBAR"), allowNull: false, defaultValue: "HOME_TOP" },
      sort_order: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
      campaign_id: { type: DataTypes.BIGINT, allowNull: true },
      start_time: { type: DataTypes.DATE, allowNull: true },
      end_time: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      sequelize,
      modelName: "Banner",
      tableName: "banners",
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Banner;
};

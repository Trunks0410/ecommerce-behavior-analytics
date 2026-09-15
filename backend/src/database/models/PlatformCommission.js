import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class PlatformCommission extends Model {
    static associate(models) {
      PlatformCommission.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
      PlatformCommission.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
    }
  }

  PlatformCommission.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
      commission_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      effective_from: { type: DataTypes.DATEONLY, allowNull: false },
      effective_to: { type: DataTypes.DATEONLY, allowNull: true },
      created_by: { type: DataTypes.BIGINT, allowNull: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: "PlatformCommission",
      tableName: "platform_commissions",
      timestamps: false,
    }
  );

  return PlatformCommission;
};

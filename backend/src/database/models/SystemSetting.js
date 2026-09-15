import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class SystemSetting extends Model {
    static associate(models) {
      SystemSetting.belongsTo(models.User, { foreignKey: "updated_by", as: "updater" });
    }
  }

  SystemSetting.init(
    {
      setting_key: { type: DataTypes.STRING(100), primaryKey: true },
      setting_value: { type: DataTypes.TEXT, allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      updated_by: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      sequelize,
      modelName: "SystemSetting",
      tableName: "system_settings",
      createdAt: false,
      updatedAt: "updated_at",
    }
  );

  return SystemSetting;
};

import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  Notification.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.STRING(50), allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: "Notification",
      tableName: "notifications",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Notification;
};

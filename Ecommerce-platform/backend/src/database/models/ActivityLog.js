import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    static associate(models) {
      ActivityLog.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  ActivityLog.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      action_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ActivityLog",
      tableName: "activity_logs",
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ActivityLog;
};

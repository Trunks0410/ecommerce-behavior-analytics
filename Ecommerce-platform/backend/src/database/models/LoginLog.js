import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class LoginLog extends Model {}

  LoginLog.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      email_or_phone: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      ip_address: {
        type: DataTypes.STRING(45),
      },

      status: {
        type: DataTypes.ENUM("SUCCESS", "FAILED"),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "LoginLog",
      tableName: "login_logs",
      createdAt: "attempted_at",
      updatedAt: false,
    },
  );

  return LoginLog;
};
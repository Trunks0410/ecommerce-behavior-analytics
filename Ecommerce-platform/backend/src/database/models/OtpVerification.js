import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class OtpVerification extends Model {
    static associate(models) {
      OtpVerification.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  OtpVerification.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      otp_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },

      type: {
        type: DataTypes.ENUM(
          "PASSWORD_RECOVERY",
          "ACCOUNT_ACTIVATION",
        ),
        allowNull: false,
      },

      expired_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      is_used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // ← CỘT MỚI: thời điểm bị khoá do nhập OTP sai quá 3 lần (flow d)
      // Chạy migration để thêm cột này vào DB
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: "OtpVerification",
      tableName: "otp_verifications",
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return OtpVerification;
};
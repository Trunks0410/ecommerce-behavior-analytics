import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class PaymentLog extends Model {
    static associate(models) {
      // Không cần association bắt buộc, dùng order_code để trace
    }
  }

  PaymentLog.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      transaction_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      order_code: { type: DataTypes.STRING(100), allowNull: false },
      gateway_name: { type: DataTypes.STRING(50), allowNull: false }, // VNPAY, MOMO, ZALOPAY, COD
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false }, // PAID, UNPAID, FAILED, REFUNDED
      trans_id: { type: DataTypes.STRING(100), allowNull: true }, // Mã GD phía đối tác
      message: { type: DataTypes.STRING(255), allowNull: true }, // Lời nhắn hoặc lỗi
    },
    {
      sequelize,
      modelName: "PaymentLog",
      tableName: "payment_logs",
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return PaymentLog;
};

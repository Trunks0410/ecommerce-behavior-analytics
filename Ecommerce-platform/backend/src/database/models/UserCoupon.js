import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class UserCoupon extends Model {
    static associate(models) {
      UserCoupon.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      UserCoupon.belongsTo(models.Coupon, { foreignKey: "coupon_id", as: "coupon" });
    }
  }

  UserCoupon.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      coupon_id: { type: DataTypes.BIGINT, allowNull: false },
      is_used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      saved_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      used_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "UserCoupon",
      tableName: "user_coupons",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return UserCoupon;
};

import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class UserAddress extends Model {
    static associate(models) {
      UserAddress.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  UserAddress.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      receiver_name: { type: DataTypes.STRING(200), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      province: { type: DataTypes.STRING(100), allowNull: false },
      district: { type: DataTypes.STRING(100), allowNull: false },
      ward: { type: DataTypes.STRING(100), allowNull: false },
      street: { type: DataTypes.STRING(255), allowNull: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: "UserAddress",
      tableName: "user_addresses",
      timestamps: false,
    }
  );

  return UserAddress;
};

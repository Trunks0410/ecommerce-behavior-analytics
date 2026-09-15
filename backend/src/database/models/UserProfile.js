import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class UserProfile extends Model {
    static associate(models) {
      UserProfile.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      UserProfile.belongsTo(models.Shop, { foreignKey: "shipper_shop_id", as: "shipperShop" });
    }
  }

  UserProfile.init(
    {
      user_id: { type: DataTypes.BIGINT, primaryKey: true, allowNull: false },
      full_name: { type: DataTypes.STRING(200), allowNull: true },
      avatar_url: { type: DataTypes.TEXT, allowNull: true },
      gender: { type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"), allowNull: true },
      birthday: { type: DataTypes.DATEONLY, allowNull: true },
      shipper_shop_id: { type: DataTypes.BIGINT, allowNull: true },
      operating_areas: { type: DataTypes.JSON, allowNull: true },
    },
    {
      sequelize,
      modelName: "UserProfile",
      tableName: "user_profiles",
      timestamps: false,
    }
  );

  return UserProfile;
};

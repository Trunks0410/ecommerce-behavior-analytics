import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.hasMany(models.User, { foreignKey: "role_id", as: "users" });
      Role.belongsToMany(models.Policy, {
        through: models.RolePolicy,
        foreignKey: "role_id",
        otherKey: "policy_id",
        as: "policies",
      });
      Role.hasMany(models.RolePolicy, { foreignKey: "role_id", as: "rolePolicies" });
    }
  }

  Role.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      role_name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: "Role",
      tableName: "roles",
      timestamps: false,
    }
  );

  return Role;
};

import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Policy extends Model {
    static associate(models) {
      Policy.belongsToMany(models.Role, {
        through: models.RolePolicy,
        foreignKey: "policy_id",
        otherKey: "role_id",
        as: "roles",
      });
      Policy.belongsToMany(models.User, {
        through: models.UserPolicy,
        foreignKey: "policy_id",
        otherKey: "user_id",
        as: "users",
      });
      Policy.hasMany(models.RolePolicy, { foreignKey: "policy_id", as: "rolePolicies" });
      Policy.hasMany(models.UserPolicy, { foreignKey: "policy_id", as: "userPolicies" });
    }
  }

  Policy.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      effect: {
        type: DataTypes.ENUM("ALLOW", "DENY"),
        allowNull: false,
        defaultValue: "ALLOW",
      },
      actions: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: "Mảng các action được phép, ví dụ: ['order:read', 'order:approve'] hoặc ['*']",
      },
      is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Policy mặc định của hệ thống không thể xóa",
      },
    },
    {
      sequelize,
      modelName: "Policy",
      tableName: "policies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Policy;
};


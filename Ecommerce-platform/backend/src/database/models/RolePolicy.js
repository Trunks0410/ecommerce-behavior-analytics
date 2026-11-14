import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class RolePolicy extends Model {
    static associate(models) {
      RolePolicy.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
      RolePolicy.belongsTo(models.Policy, { foreignKey: "policy_id", as: "policy" });
    }
  }

  RolePolicy.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "roles",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      policy_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "policies",
          key: "id",
        },
        onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: "RolePolicy",
      tableName: "role_policies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ["role_id", "policy_id"],
          name: "uk_role_policy",
        },
      ],
    }
  );

  return RolePolicy;
};


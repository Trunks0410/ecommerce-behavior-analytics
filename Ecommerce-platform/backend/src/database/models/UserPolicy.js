import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class UserPolicy extends Model {
    static associate(models) {
      UserPolicy.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      UserPolicy.belongsTo(models.Policy, { foreignKey: "policy_id", as: "policy" });
    }
  }

  UserPolicy.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "users",
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
      modelName: "UserPolicy",
      tableName: "user_policies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "policy_id"],
          name: "uk_user_policy",
        },
      ],
    }
  );

  return UserPolicy;
};


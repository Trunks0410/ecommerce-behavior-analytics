import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      Conversation.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      Conversation.belongsTo(models.Shop, { foreignKey: "shop_id", as: "shop" });
      Conversation.hasMany(models.Message, { foreignKey: "conversation_id", as: "messages" });
    }
  }

  Conversation.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
    },
    {
      sequelize,
      modelName: "Conversation",
      tableName: "conversations",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Conversation;
};

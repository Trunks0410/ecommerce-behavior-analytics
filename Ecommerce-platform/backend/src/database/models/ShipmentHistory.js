import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ShipmentHistory extends Model {
    static associate(models) {
      ShipmentHistory.belongsTo(models.Shipment, { foreignKey: "shipment_id", as: "shipment" });
    }
  }

  ShipmentHistory.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shipment_id: { type: DataTypes.BIGINT, allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false },
      location: { type: DataTypes.STRING(255), allowNull: true },
      note: { type: DataTypes.STRING(500), allowNull: true },
      proof_image_url: { type: DataTypes.STRING(1000), allowNull: true },
    },
    {
      sequelize,
      modelName: "ShipmentHistory",
      tableName: "shipment_histories",
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ShipmentHistory;
};

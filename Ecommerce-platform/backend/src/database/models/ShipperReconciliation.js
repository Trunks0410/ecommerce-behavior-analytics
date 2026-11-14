import { Model, DataTypes } from "sequelize";

export default (sequelize, DataTypes) => {
  class ShipperReconciliation extends Model {
    static associate(models) {
      ShipperReconciliation.belongsTo(models.User, { foreignKey: "shipper_id", as: "shipper" });
      ShipperReconciliation.belongsTo(models.User, { foreignKey: "confirmed_by", as: "processor" });
      ShipperReconciliation.hasMany(models.ShopOrder, { foreignKey: "shipper_reconciliation_id", as: "orders" });
    }
  }

  ShipperReconciliation.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shipper_id: { type: DataTypes.BIGINT, allowNull: false },
      amount_submitted: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      confirmed_by: { type: DataTypes.BIGINT, allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ShipperReconciliation",
      tableName: "shipper_reconciliations",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ShipperReconciliation;
};

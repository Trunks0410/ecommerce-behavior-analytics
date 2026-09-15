import db from "../../database/models/index.js";

const getCollectedCOD = async (shipperId) => {
  return await db.ShopOrder.findAll({
    where: {
      shipper_id: shipperId,
      cod_status: "HELD_BY_SHIPPER"
    },
    include: [
      {
        model: db.ParentOrder,
        as: "parentOrder",
        where: { payment_method: "COD" },
        attributes: ["id", "checkout_code", "payment_method", "shipping_address"]
      },
      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name"]
      }
    ],
    order: [["updated_at", "DESC"]]
  });
};

const submitCODReconciliation = async (shipperId, orderIds, note = null) => {
  if (!orderIds || orderIds.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một đơn hàng để đối soát");
  }

  const transaction = await db.sequelize.transaction();
  try {
    // 1. Fetch and validate all orders
    const orders = await db.ShopOrder.findAll({
      where: {
        id: orderIds,
        shipper_id: shipperId,
        cod_status: "HELD_BY_SHIPPER"
      },
      include: [
        {
          model: db.ParentOrder,
          as: "parentOrder",
          where: { payment_method: "COD" }
        }
      ],
      transaction
    });

    if (orders.length !== orderIds.length) {
      throw new Error("Một số đơn hàng đã chọn không hợp lệ hoặc đã được đối soát trước đó");
    }

    // 2. Sum up collected COD amounts
    let totalSum = 0;
    orders.forEach(order => {
      totalSum += Number(order.cod_amount_collected || 0);
    });

    // 3. Create ShipperReconciliation record
    const recon = await db.ShipperReconciliation.create({
      shipper_id: shipperId,
      amount_submitted: totalSum,
      status: "PENDING",
      note: note
    }, { transaction });

    // 4. Update orders status to SUBMITTED and link to reconciliation ID
    await db.ShopOrder.update(
      {
        cod_status: "SUBMITTED",
        shipper_reconciliation_id: recon.id
      },
      {
        where: { id: orderIds },
        transaction
      }
    );

    await transaction.commit();
    return recon;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getReconciliationHistory = async (shipperId) => {
  return await db.ShipperReconciliation.findAll({
    where: { shipper_id: shipperId },
    include: [
      {
        model: db.ShopOrder,
        as: "orders",
        attributes: ["id", "shop_order_code", "final_amount", "cod_amount_collected", "updated_at"]
      }
    ],
    order: [["created_at", "DESC"]]
  });
};

export default { getCollectedCOD, submitCODReconciliation, getReconciliationHistory };

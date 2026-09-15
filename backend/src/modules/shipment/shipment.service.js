import db from "../../database/models/index.js";
import { generateTrackingNumber } from "../../core/utils/helpers.js";

const getShipmentHistory = async (shipmentId) => {
  const shipment = await db.Shipment.findByPk(shipmentId, {
    include: [
      {
        model: db.ShipmentHistory,
        as: "histories",
      }
    ],
    order: [[{ model: db.ShipmentHistory, as: "histories" }, "created_at", "DESC"]],
  });

  if (!shipment) throw new Error("Không tìm thấy vận đơn");
  return shipment.histories;
};

const getShipmentByOrderId = async (orderId) => {
  const shipment = await db.Shipment.findOne({
    where: { shop_order_id: orderId },
    include: [
      {
        model: db.ShipmentHistory,
        as: "histories",
      },
      {
        model: db.User,
        as: "shipper",
        attributes: ["id", "phone"],
        include: [{
          model: db.UserProfile,
          as: "profile",
          attributes: ["full_name", "avatar_url"]
        }]
      }
    ],
    order: [[{ model: db.ShipmentHistory, as: "histories" }, "created_at", "DESC"]],
  });

  if (shipment) {
    const plainShipment = shipment.toJSON();
    if (plainShipment.shipper && plainShipment.shipper.profile) {
      plainShipment.shipper.full_name = plainShipment.shipper.profile.full_name;
      plainShipment.shipper.avatar_url = plainShipment.shipper.profile.avatar_url;
      delete plainShipment.shipper.profile;
    }
    return plainShipment;
  }

  return shipment;
};

const createShipment = async (shopOrderId, shipperId = null, transaction = null) => {
  const trackingNumber = generateTrackingNumber();
  
  const shipment = await db.Shipment.create({
    shop_order_id: shopOrderId,
    shipper_id: shipperId,
    tracking_number: trackingNumber,
    status: 'PENDING_PICKUP',
    shipping_fee: 30000, // Default for now
  }, { transaction });

  await db.ShipmentHistory.create({
    shipment_id: shipment.id,
    status: 'PENDING_PICKUP',
    note: 'Vận đơn đã được tạo và đang chờ shipper nhận lấy hàng',
  }, { transaction });

  return shipment;
};

const addShipmentHistory = async (shipmentId, status, location, note, proofImageUrl, shipperId, collectedShippingFee, isBom) => {
  const shipment = await db.Shipment.findByPk(shipmentId);
  if (!shipment) throw new Error("Không tìm thấy vận đơn");
  
  if (shipment.shipper_id !== shipperId && shipperId !== 'system') {
    // Allow claiming if it's unassigned
    if (shipment.shipper_id === null && status === 'PENDING_PICKUP') {
      // It's fine, we will update the shipper_id later in the transaction
    } else {
      throw new Error("Không có quyền cập nhật vận đơn này");
    }
  }

  const transaction = await db.sequelize.transaction();
  try {
    // 1. Cập nhật trạng thái Shipment (và nhận đơn nếu chưa có shipper)
    const updateData = { status };
    if (shipment.shipper_id === null && shipperId !== 'system') {
      updateData.shipper_id = shipperId;
    }
    await shipment.update(updateData, { transaction });

    // 2. Thêm lịch sử cập nhật
    const history = await db.ShipmentHistory.create({
      shipment_id: shipmentId,
      status,
      location,
      note,
      proof_image_url: proofImageUrl,
    }, { transaction });

    // 3. Đồng bộ status sang ShopOrder nếu giao thành công hoặc hoàn trả
    if (['DELIVERED', 'FAILED', 'RETURNED'].includes(status)) {
      const shopOrder = await db.ShopOrder.findByPk(shipment.shop_order_id, {
        include: [{ model: db.ParentOrder, as: "parentOrder" }],
        transaction
      });
      if (shopOrder) {
        let orderStatus = shopOrder.status;
        const oldOrderStatus = shopOrder.status;
        let logNote = null;

        if (status === 'DELIVERED') {
          orderStatus = 'DELIVERED';
        } else if (status === 'FAILED') {
          if (shopOrder.status === 'RETURN_PENDING') {
            orderStatus = 'RETURN_PENDING';
          } else {
            const newAttempts = shopOrder.delivery_attempts + 1;
            await shopOrder.update({ delivery_attempts: newAttempts }, { transaction });
            
            // Nếu từ chối nhận hoặc đã giao thất bại 3 lần
            if (note === 'Người mua từ chối nhận hàng' || newAttempts >= 3) {
              orderStatus = 'RETURN_PENDING';

              const isCOD = shopOrder.parentOrder?.payment_method === 'COD';
              let newShippingFee = 30000;

              if (note === 'Người mua từ chối nhận hàng') {
                const isBomRefusal = isBom !== false; // Mặc định là bom trừ khi shipper chọn là lý do chính đáng
                if (isBomRefusal) {
                  logNote = "BOM: Người mua từ chối nhận hàng (Lý do không chính đáng)";
                  if (isCOD) {
                    newShippingFee = (collectedShippingFee !== undefined && collectedShippingFee !== null) ? Math.max(0, Number(collectedShippingFee)) : 0;
                  } else {
                    newShippingFee = 30000;
                  }
                } else {
                  logNote = "Người mua từ chối nhận hàng (Lý do chính đáng: lỗi sản phẩm/giao sai)";
                  newShippingFee = 0;
                }
              } else if (note === 'Không liên lạc được người mua' || note === 'Sai địa chỉ giao hàng' || newAttempts >= 3) {
                if (newAttempts >= 3 && note === 'Không liên lạc được người mua') {
                  logNote = "BOM: Không liên lạc được người mua quá 3 lần";
                } else {
                  logNote = `Giao hàng thất bại lần thứ ${newAttempts} (${note || 'Không gặp khách'})`;
                }
                newShippingFee = 0;
              }

              // Cập nhật phí ship trong shopOrder và tính lại final_amount
              await shopOrder.update({
                shipping_fee: newShippingFee,
                final_amount: Math.max(0, Number(shopOrder.subtotal) + newShippingFee - Number(shopOrder.discount_amount))
              }, { transaction });

              // Đồng bộ phí ship vào shipment
              await shipment.update({
                shipping_fee: newShippingFee
              }, { transaction });
            } else {
              orderStatus = 'SHIPPING'; // remains shipping, try again next time
              logNote = `Giao hàng thất bại lần thứ ${newAttempts} (${note || 'Không liên lạc được'})`;
            }
          }
        } else if (status === 'RETURNED') {
          orderStatus = 'RETURNED';

          // Restock items
          const returnRequest = await db.ReturnRequest.findOne({
            where: { shop_order_id: shopOrder.id, status: ["APPROVED_BY_SHOP", "RESOLVED_BY_ADMIN"] },
            include: [
              {
                model: db.ReturnItem,
                as: "items",
                include: [{ model: db.OrderItem, as: "orderItem" }]
              }
            ],
            transaction
          });
          const returnService = (await import("./returnService.js")).default;
          if (returnRequest) {
            // Customer return request
            returnRequest.shopOrder = shopOrder; // Gán shopOrder để _processRefundOnly có thể sử dụng
            await returnService._processRestockOnly(returnRequest, transaction);
            await returnService._processRefundOnly(returnRequest, transaction);
            await returnRequest.update({ status: "COMPLETED" }, { transaction });
            await db.ParentOrder.update({ payment_status: "REFUNDED" }, { where: { id: shopOrder.parent_order_id }, transaction });
          } else {
            // Failed delivery return, restock items from OrderItem
            const orderItems = await db.OrderItem.findAll({
              where: { shop_order_id: shopOrder.id },
              transaction
            });
            for (const item of orderItems) {
              if (item.variant_id) {
                await db.ProductVariant.increment("stock_quantity", {
                  by: item.quantity,
                  where: { id: item.variant_id },
                  transaction
                });
              }
            }

            // Hoàn lại điểm tích lũy đã dùng cho đơn hàng (áp dụng cho cả COD và Online)
            const user = await db.User.findByPk(shopOrder.parentOrder.user_id, { transaction });
            if (user && shopOrder.points_used > 0) {
              user.loyalty_points = Number(user.loyalty_points || 0) + Number(shopOrder.points_used);
              await user.save({ transaction });
            }

            // Hoàn tiền cho khách nếu đã thanh toán online (trừ đi phí ship)
            if (shopOrder.parentOrder && shopOrder.parentOrder.payment_status === "PAID") {
              const cashRefundToUser = Math.max(0, Number(shopOrder.subtotal) + 30000 - Number(shopOrder.discount_amount) - Number(shopOrder.shipping_fee));
              
              // Đọc tỷ lệ quy đổi điểm từ system_settings
              const redeemRateSetting = await db.SystemSetting.findOne({ where: { setting_key: 'LOYALTY_POINT_REDEEM_RATE' } });
              const redeemRate = redeemRateSetting ? Number(redeemRateSetting.setting_value) : 100;
              const pointsToRefund = Math.floor(cashRefundToUser / redeemRate);

              if (user) {
                user.loyalty_points = Math.max(0, Number(user.loyalty_points || 0) + pointsToRefund);
                await user.save({ transaction });
              }
            }
          }
        }

        const orderUpdateData = { status: orderStatus };
        if (shopOrder.shipper_id === null && updateData.shipper_id) {
          orderUpdateData.shipper_id = updateData.shipper_id;
        }

        // If DELIVERED and COD, update parentOrder payment status to PAID when all orders are completed/delivered
        if (shopOrder.parentOrder && shopOrder.parentOrder.payment_method === "COD" && orderStatus === "DELIVERED") {
          orderUpdateData.cod_amount_collected = shopOrder.final_amount;
          orderUpdateData.cod_status = "HELD_BY_SHIPPER";
          
          const allShopOrders = await db.ShopOrder.findAll({
            where: { parent_order_id: shopOrder.parent_order_id },
            transaction
          });
          const allCompleted = allShopOrders.every(o =>
            (o.id === shopOrder.id) ? true : ["DELIVERED", "CANCELLED", "RETURN_PENDING", "RETURNED", "COMPLETED"].includes(o.status)
          );
          if (allCompleted) {
            await shopOrder.parentOrder.update({ payment_status: "PAID" }, { transaction });
          }
        }

        // Nếu là đơn COD và chuyển sang trạng thái chuyển hoàn (RETURN_PENDING) do thất bại
        if (shopOrder.parentOrder && shopOrder.parentOrder.payment_method === "COD" && orderStatus === "RETURN_PENDING") {
          const isCOD = shopOrder.parentOrder?.payment_method === 'COD';
          const collectedFee = (note === 'Người mua từ chối nhận hàng' && isBom !== false && isCOD)
            ? ((collectedShippingFee !== undefined && collectedShippingFee !== null) ? Math.max(0, Number(collectedShippingFee)) : 0)
            : 0;

          if (collectedFee > 0) {
            orderUpdateData.cod_amount_collected = collectedFee;
            orderUpdateData.cod_status = "HELD_BY_SHIPPER";
          } else {
            orderUpdateData.cod_amount_collected = 0;
            orderUpdateData.cod_status = "NOT_COD";
          }
        }

        await shopOrder.update(orderUpdateData, { transaction });
        
        // Ghi log vào ShopOrderStatusHistory
        await db.ShopOrderStatusHistory.create({
          shop_order_id: shopOrder.id,
          old_status: oldOrderStatus,
          new_status: orderStatus,
          note: logNote || note || (status === 'FAILED' ? `Giao hàng thất bại lần ${shopOrder.delivery_attempts}` : `Cập nhật tự động từ shipper (Shipment ID: ${shipmentId})`),
          changed_by: shipperId !== 'system' ? shipperId : null
        }, { transaction });
      }
    } else if (status === 'IN_TRANSIT' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY' || status === 'PENDING_PICKUP') {
      // Khi lấy hàng hoặc đang giao thì chuyển order về SHIPPING 
      const shopOrder = await db.ShopOrder.findByPk(shipment.shop_order_id, { transaction });
      if (shopOrder) {
        const orderUpdateData = {};
        let needsUpdate = false;
        if (shopOrder.status !== 'RETURN_PENDING' && shopOrder.status !== 'RETURNED') {
          if (shopOrder.status !== 'SHIPPING') {
            orderUpdateData.status = 'SHIPPING';
            needsUpdate = true;
          }
        }
        if (shopOrder.shipper_id === null && updateData.shipper_id) {
          orderUpdateData.shipper_id = updateData.shipper_id;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const oldStatus = shopOrder.status;
          await shopOrder.update(orderUpdateData, { transaction });
          
          if (orderUpdateData.status) {
            await db.ShopOrderStatusHistory.create({
              shop_order_id: shopOrder.id,
              old_status: oldStatus,
              new_status: orderUpdateData.status,
              note: `Shipper bắt đầu giao hàng (Shipment ID: ${shipmentId})`,
              changed_by: shipperId !== 'system' ? shipperId : null
            }, { transaction });
          }
        }
      }
    }

    await transaction.commit();
    return history;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export default {
  getShipmentHistory,
  getShipmentByOrderId,
  createShipment,
  addShipmentHistory
};

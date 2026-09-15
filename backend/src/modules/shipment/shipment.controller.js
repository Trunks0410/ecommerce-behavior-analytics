import shipmentService from "./shipment.service.js";

const getShipmentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await shipmentService.getShipmentHistory(id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShipmentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shipment = await shipmentService.getShipmentByOrderId(orderId);
    if (!shipment) {
      return res.status(404).json({ message: "Không tìm thấy vận đơn" });
    }
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateShipmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, note, proof_image_url, collected_shipping_fee, is_bom } = req.body;
    const shipperId = req.user.id;
    
    // Require proof of delivery if status is DELIVERED
    if (status === 'DELIVERED' && !proof_image_url) {
      return res.status(400).json({ message: "Bắt buộc phải có ảnh bằng chứng khi giao hàng thành công" });
    }
 
    const history = await shipmentService.addShipmentHistory(
      id, status, location, note, proof_image_url, shipperId, collected_shipping_fee, is_bom
    );
 
    res.json(history);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default {
  getShipmentHistory,
  getShipmentByOrderId,
  updateShipmentStatus
};

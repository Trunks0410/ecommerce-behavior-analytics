import express from 'express';
import shipmentController from '../controllers/shipment.controller.js';
import { verifyToken, isShipper } from '../middleware/auth.js';

const router = express.Router();

router.get('/order/:orderId', verifyToken, shipmentController.getShipmentByOrderId);
router.get('/:id/history', verifyToken, shipmentController.getShipmentHistory);

// Only shipper can update shipment status
router.post('/:id/history', verifyToken, isShipper, shipmentController.updateShipmentStatus);

export default router;

import express from 'express';
import shipmentController from './shipment.controller.js';
import { verifyToken, isShipper } from '../../core/middleware/auth.js';

const router = express.Router();

router.get('/order/:orderId', verifyToken, shipmentController.getShipmentByOrderId);
router.get('/:id/history', verifyToken, shipmentController.getShipmentHistory);

// Only shipper can update shipment status
router.post('/:id/history', verifyToken, isShipper, shipmentController.updateShipmentStatus);

export default router;

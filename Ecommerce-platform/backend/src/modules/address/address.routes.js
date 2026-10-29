import express from "express";
import { verifyToken } from "../../core/middleware/auth.js";
import addressController from "./address.controller.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", addressController.getMyAddresses);
router.post("/", addressController.createAddress);
router.put("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);

export default router;

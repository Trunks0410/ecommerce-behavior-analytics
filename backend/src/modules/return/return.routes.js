import express from "express";
import returnController from "./return.controller.js";
import { verifyToken } from "../../core/middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", returnController.createReturnRequest);
router.get("/", returnController.getMyReturnRequests);
router.get("/:id", returnController.getReturnRequestDetail);

export default router;

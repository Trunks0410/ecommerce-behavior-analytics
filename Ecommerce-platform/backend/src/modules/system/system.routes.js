import express from "express";
import systemController from "./system.controller.js";

const router = express.Router();

router.get("/settings/public", systemController.getPublicSettings);

export default router;

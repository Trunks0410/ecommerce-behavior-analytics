import express from "express";
import { handleTranslate } from "./translate.controller.js";

const router = express.Router();

// Route công khai phục vụ dịch thuật
router.post("/", handleTranslate);

export default router;


import express from "express";
import categoryController from "./category.controller.js";

const router = express.Router();

router.get("/", categoryController.getAllCategories);
router.get("/:slug", categoryController.getCategoryBySlug);

export default router;

import express from "express";
import { login, verify, ssoExchange } from "./auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.get("/verify", verify);
router.post("/sso-exchange", ssoExchange);

export default router;

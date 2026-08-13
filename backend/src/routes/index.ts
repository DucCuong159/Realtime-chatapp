import { Router } from "express";
import authRouters from "./auth.route.js";
import userRouters from "./user.route.js";

const router = Router();

router.use("/auth", authRouters);
router.use("/user", userRouters);

export default router;

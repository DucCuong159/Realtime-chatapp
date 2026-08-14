import { Router } from "express";
import authRouters from "./auth.route.js";
import conversationRouters from "./conversation.route.js";
import userRouters from "./user.route.js";

const router = Router();

router.use("/auth", authRouters);
router.use("/conversation", conversationRouters);
router.use("/user", userRouters);

export default router;

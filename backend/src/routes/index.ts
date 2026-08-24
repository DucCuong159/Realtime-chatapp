import { Router } from "express";
import aiRouters from "./ai.route.js";
import authRouters from "./auth.route.js";
import conversationRouters from "./conversation.route.js";
import userRouters from "./user.route.js";

const router = Router();

router.use("/ai", aiRouters);
router.use("/auth", authRouters);
router.use("/conversation", conversationRouters);
router.use("/user", userRouters);

export default router;

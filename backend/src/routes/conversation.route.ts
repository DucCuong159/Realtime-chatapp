import express, { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import {
  createConversationController,
  getSingleConversationsController,
  getUserConversationsController,
} from "../controllers/conversation.controller.js";
import { sendMessageController } from "../controllers/message.controller.js";

const conversationRouters = Router()
  .use(passportAuthenticateJwt)
  .post("/create", createConversationController)
  .post("/message/send", express.json({ limit: "15mb" }), sendMessageController)
  .get("/all", getUserConversationsController)
  .get("/:conversationId", getSingleConversationsController);

export default conversationRouters;

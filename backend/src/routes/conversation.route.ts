import express, { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import {
  createConversationController,
  getSingleConversationsController,
  getUserConversationsController,
} from "../controllers/conversation.controller.js";
import { sendMessageController } from "../controllers/message.controller.js";

// Allow 16mb for JSON parser (15MB Base64 image payload + 1MB envelope overhead for JSON fields)
const MESSAGE_SEND_PAYLOAD_LIMIT = "16mb";

const conversationRouters = Router()
  .use(passportAuthenticateJwt)
  .post("/create", createConversationController)
  .post(
    "/message/send",
    express.json({ limit: MESSAGE_SEND_PAYLOAD_LIMIT }),
    sendMessageController,
  )
  .get("/all", getUserConversationsController)
  .get("/:conversationId", getSingleConversationsController);

export default conversationRouters;

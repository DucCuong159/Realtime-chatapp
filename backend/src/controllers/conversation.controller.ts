import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import {
  createConversationService,
  getSingleConversationService,
  getUserConversationsService,
} from "../services/conversation.service.js";
import {
  conversationIdSchema,
  createConversationSchema,
} from "../validators/conversation.validator.js";

export const createConversationController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const body = createConversationSchema.parse(req.body);

    const conversation = await createConversationService(userId, body);
    return res
      .status(HTTPSTATUS.SUCCESS)
      .json({ message: "Conversation created successfully", conversation });
  },
);

export const getUserConversationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const conversations = await getUserConversationsService(userId);

    return res.status(HTTPSTATUS.SUCCESS).json({
      message: "User conversations retrieved successfully",
      conversations,
    });
  },
);

export const getSingleConversationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const { conversationId } = conversationIdSchema.parse(req.params);

    const { conversation, messages } = await getSingleConversationService(
      conversationId,
      userId,
    );
    return res.status(HTTPSTATUS.SUCCESS).json({
      message: "User conversations retrieved successfully",
      conversation,
      messages,
    });
  },
);

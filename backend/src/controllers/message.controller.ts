import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { sendMessageService } from "../services/message.service.js";
import { sendMessageSchema } from "../validators/message.validator.js";

export const sendMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const body = sendMessageSchema.parse(req.body);

    const result = await sendMessageService(userId, body);

    return res.status(HTTPSTATUS.SUCCESS).json({
      message: "Message sent successfully",
      ...result,
    });
  },
);

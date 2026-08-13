import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { getUsersService } from "../services/user.service.js";

export const getUsersController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const users = await getUsersService(userId);
    return res
      .status(HTTPSTATUS.SUCCESS)
      .json({ message: "Users retrieved successfully", users });
  },
);

import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import {
  getUsersService,
  updateProfileService,
} from "../services/user.service.js";
import { updateProfileSchema } from "../validators/user.validator.js";

export const getProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    return res
      .status(HTTPSTATUS.SUCCESS)
      .json({ message: "Profile retrieved successfully", user });
  },
);

export const updateProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = updateProfileSchema.parse(req.body);
    const user = await updateProfileService(userId, body);
    return res
      .status(HTTPSTATUS.SUCCESS)
      .json({ message: "Profile updated successfully", user });
  },
);

export const getUsersController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const users = await getUsersService(userId);
    return res
      .status(HTTPSTATUS.SUCCESS)
      .json({ message: "Users retrieved successfully", users });
  },
);

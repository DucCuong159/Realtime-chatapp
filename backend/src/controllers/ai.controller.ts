import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { getAvailableTextOutModelsService } from "../services/ai.service.js";

export const getAiModelsController = asyncHandler(
  async (req: Request, res: Response) => {
    const forceRefresh = req.query.refresh === "true" || req.query.refresh === "1";
    const result = await getAvailableTextOutModelsService(forceRefresh);

    return res.status(HTTPSTATUS.SUCCESS).json({
      message: "AI models retrieved successfully",
      ...result,
    });
  },
);

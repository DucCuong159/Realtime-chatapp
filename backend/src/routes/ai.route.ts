import { Router } from "express";
import rateLimit from "express-rate-limit";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import { getAiModelsController } from "../controllers/ai.controller.js";

// Rate limit: 10 requests per minute per IP address
const aiModelsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    message: "Too many AI model requests, please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiRouters = Router()
  .use(passportAuthenticateJwt)
  .get("/models", aiModelsLimiter, getAiModelsController);

export default aiRouters;


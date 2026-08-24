import { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import { getAiModelsController } from "../controllers/ai.controller.js";

const aiRouters = Router()
  .use(passportAuthenticateJwt)
  .get("/models", getAiModelsController);

export default aiRouters;

import express, { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import {
  getProfileController,
  getUsersController,
  updateProfileController,
} from "../controllers/user.controller.js";

// Allow 16mb for JSON parser (15MB Base64 image payload + 1MB envelope overhead for JSON fields)
const PROFILE_PAYLOAD_LIMIT = "16mb";

const userRouters = Router()
  .use(passportAuthenticateJwt)
  .get("/profile", getProfileController)
  .put(
    "/profile",
    express.json({ limit: PROFILE_PAYLOAD_LIMIT }),
    updateProfileController,
  )
  .get("/all", getUsersController);

export default userRouters;

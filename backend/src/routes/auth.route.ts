import { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import {
  authStatusController,
  loginController,
  logoutController,
  registerController,
} from "../controllers/auth.controller.js";

const authRouters = Router()
  .post("/register", registerController)
  .post("/login", loginController)
  .post("/logout", logoutController)
  .get("/status", passportAuthenticateJwt, authStatusController);

export default authRouters;

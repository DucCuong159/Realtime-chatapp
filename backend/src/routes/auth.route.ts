import { Router } from "express";
import rateLimit from "express-rate-limit";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import {
  authStatusController,
  loginController,
  logoutController,
  registerController,
} from "../controllers/auth.controller.js";

// Limit to 5 authentication attempts per 15 minutes per IP address
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRouters = Router()
  .post("/register", authLimiter, registerController)
  .post("/login", authLimiter, loginController)
  .post("/logout", logoutController)
  .get("/status", passportAuthenticateJwt, authStatusController);

export default authRouters;

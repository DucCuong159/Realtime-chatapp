import { Router } from "express";
import rateLimit from "express-rate-limit";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import {
  authStatusController,
  loginController,
  logoutController,
  registerController,
} from "../controllers/auth.controller.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    message: "Login limit reached (maximum 5 attempts).",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    message: "Sign up limit reached (maximum 5 attempts).",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRouters = Router()
  .post("/register", registerLimiter, registerController)
  .post("/login", loginLimiter, loginController)
  .post("/logout", logoutController)
  .get("/status", passportAuthenticateJwt, authStatusController);

export default authRouters;

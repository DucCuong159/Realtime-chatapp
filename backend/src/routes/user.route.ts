import { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import {
  getProfileController,
  getUsersController,
  updateProfileController,
} from "../controllers/user.controller.js";

const userRouters = Router()
  .use(passportAuthenticateJwt)
  .get("/profile", getProfileController)
  .put("/profile", updateProfileController)
  .get("/all", getUsersController);

export default userRouters;

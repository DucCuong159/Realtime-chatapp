import { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import { getUsersController } from "../controllers/user.controller.js";

const userRouters = Router()
  .use(passportAuthenticateJwt)
  .get("/all", getUsersController);

export default userRouters;

import { Response } from "express";
import jwt from "jsonwebtoken";
import { Env } from "../config/env.config.js";
import { convertTimeToMs, Time } from "./date-time.js";

type Cookie = {
  res: Response;
  userId: string;
};

export const setJwtAuthCookie = (
  { res, userId }: Cookie,
  time: Time = "7d",
) => {
  const payload = { userId };
  const jwtToken = jwt.sign(payload, Env.JWT_SECRET, {
    audience: ["user"],
    expiresIn: time,
  });

  return res.cookie("accessToken", jwtToken, {
    maxAge: convertTimeToMs(time),
    httpOnly: true,
    secure: Env.NODE_ENV === "production",
    sameSite: Env.NODE_ENV === "production" ? "strict" : "lax",
  });
};

export const clearJwtAuthCookie = (res: Response) => {
  return res.clearCookie("accessToken", {
    path: "/",
    httpOnly: true,
    secure: Env.NODE_ENV === "production",
    sameSite: Env.NODE_ENV === "production" ? "strict" : "lax",
  });
};

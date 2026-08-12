import { ErrorRequestHandler } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { AppError, ErrorCodes } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log(`Error occured: ${req.path}`, err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: err?.message || "Something went wrong",
    errorCode: ErrorCodes.ERR_INTERNAL,
  });
};

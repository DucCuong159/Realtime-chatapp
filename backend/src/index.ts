import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { Request, Response } from "express";
import helmet from "helmet";
import passport from "passport";
import connectDatabase from "./config/database.config.js";
import { Env } from "./config/env.config.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

import { HTTPSTATUS } from "./config/http.config.js";
import "./config/passport.config.js";
import { asyncHandler } from "./middlewares/asyncHandler.middleware.js";
import router from "./routes/index.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: Env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.use(passport.initialize());

app.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    return res
      .status(HTTPSTATUS.SUCCESS)
      .json({ message: "Server is healthy", status: "OK" });
  }),
);

app.use("/api", router);

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(Env.PORT, () => {
      console.log(`Server is running on port ${Env.PORT}`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

app.use(errorHandler);

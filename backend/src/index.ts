import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import connectDatabase from "./config/database.config.js";
import { Env } from "./config/env.config.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: Env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

export async function startServer() {
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

import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { Request, Response } from "express";
import helmet from "helmet";
import http from "http";
import passport from "passport";
import path from "path";
import connectDatabase from "./config/database.config.js";
import { Env } from "./config/env.config.js";
import { HTTPSTATUS } from "./config/http.config.js";
import "./config/passport.config.js";
import { initializeSocket } from "./lib/socket.js";
import { asyncHandler } from "./middlewares/asyncHandler.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import router from "./routes/index.js";

const app = express();
const server = http.createServer(app);

// Attach Socket.IO to HTTP server
initializeSocket(server);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
// TODO: We will use multer later to handle large file uploads and limit sizes.
// For now, bypass the global JSON body limit for the message send route.
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/conversation/message/send") {
    return next();
  }
  express.json({ limit: "100kb" })(req, res, next);
});
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

if (Env.NODE_ENV === "production") {
  const clientPath = path.resolve(import.meta.dirname, "../../frontend/dist");

  // Serve static files
  app.use(express.static(clientPath));

  app.get(/^(?!\/api).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

async function startServer() {
  try {
    await connectDatabase();
    const sv = server.listen(Env.PORT, () => {
      console.log(`Server is running on port ${Env.PORT}`);
    });

    sv.on("error", (error: NodeJS.ErrnoException) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });

    return sv;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

app.use(errorHandler);

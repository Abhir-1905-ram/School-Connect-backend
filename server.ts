import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "./src/config/db";
import { env } from "./src/config/env";
import apiRoutes from "./src/routes";
import { errorHandler } from "./src/middleware/errorHandler";
import { sanitizeInputs } from "./src/middleware/sanitize";

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(morgan(env.isProduction ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(sanitizeInputs);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
  });
  app.use(limiter);

  app.get("/health", (_req, res) => {
    res.redirect(307, "/api/v1/health");
  });

  app.use("/api/v1", apiRoutes);

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

import { Request, Response } from "express";
import mongoose from "mongoose";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const readyState = mongoose.connection.readyState;
  const dbStatus =
    readyState === 1 ? "connected" : readyState === 2 ? "connecting" : "disconnected";

  res.status(dbStatus === "connected" ? 200 : 503).json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    dbStatus,
  });
}

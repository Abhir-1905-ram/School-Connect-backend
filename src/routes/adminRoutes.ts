import { Router } from "express";
import { getDashboardStats } from "../controllers/adminController";
import {
  exportLeadsCsv,
  exportPaymentsCsv,
} from "../controllers/exportController";
import { verifyToken, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/dashboard-stats",
  verifyToken,
  requireAdmin,
  asyncHandler(getDashboardStats)
);

router.get(
  "/export/leads",
  verifyToken,
  requireAdmin,
  asyncHandler(exportLeadsCsv)
);

router.get(
  "/export/payments",
  verifyToken,
  requireAdmin,
  asyncHandler(exportPaymentsCsv)
);

export default router;

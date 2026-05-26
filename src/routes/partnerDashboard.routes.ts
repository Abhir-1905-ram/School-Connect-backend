import { Router } from "express";
import { getPartnerDashboardStats } from "../controllers/partnerDashboardController";
import { verifyToken, requirePartner } from "../middleware/auth";
import { attachPartner } from "../middleware/attachPartner";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/dashboard-stats",
  verifyToken,
  requirePartner,
  attachPartner,
  asyncHandler(getPartnerDashboardStats)
);

export default router;

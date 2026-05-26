import { Router } from "express";
import {
  getAllPayments,
  recordPayment,
  getPaymentStats,
} from "../controllers/paymentController";
import { verifyToken, requireAdmin } from "../middleware/auth";
import { attachPartner } from "../middleware/attachPartner";
import { validate } from "../middleware/validate";
import {
  listPaymentsQueryValidator,
  recordPaymentValidator,
} from "../validators/payment.validator";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(verifyToken);

router.get("/stats", requireAdmin, asyncHandler(getPaymentStats));
router.get(
  "/",
  attachPartner,
  listPaymentsQueryValidator,
  validate,
  asyncHandler(getAllPayments)
);
router.post(
  "/",
  requireAdmin,
  recordPaymentValidator,
  validate,
  asyncHandler(recordPayment)
);

export default router;

import { Router } from "express";
import {
  getAllClients,
  getClient,
  updateClient,
  updatePaymentStatus,
} from "../controllers/clientController";
import { verifyToken } from "../middleware/auth";
import { attachPartner } from "../middleware/attachPartner";
import { validate } from "../middleware/validate";
import { mongoIdParamValidator } from "../validators/common.validator";
import {
  listClientsQueryValidator,
  updateClientValidator,
  updatePaymentStatusValidator,
} from "../validators/client.validator";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(verifyToken, attachPartner);

router.get("/", listClientsQueryValidator, validate, asyncHandler(getAllClients));
router.get(
  "/:id",
  mongoIdParamValidator,
  validate,
  asyncHandler(getClient)
);
router.put(
  "/:id/payment-status",
  mongoIdParamValidator,
  updatePaymentStatusValidator,
  validate,
  asyncHandler(updatePaymentStatus)
);
router.put(
  "/:id",
  mongoIdParamValidator,
  updateClientValidator,
  validate,
  asyncHandler(updateClient)
);

export default router;

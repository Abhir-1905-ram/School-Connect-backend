import { Router } from "express";
import {
  getAllLeads,
  getLead,
  createLead,
  updateLead,
  convertToClient,
  deleteLead,
} from "../controllers/leadController";
import { verifyToken, requireAdmin, requirePartner } from "../middleware/auth";
import { attachPartner } from "../middleware/attachPartner";
import { validate } from "../middleware/validate";
import { mongoIdParamValidator } from "../validators/common.validator";
import {
  listLeadsQueryValidator,
  createLeadValidator,
  updateLeadValidator,
} from "../validators/lead.validator";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(verifyToken);

router.get(
  "/",
  attachPartner,
  listLeadsQueryValidator,
  validate,
  asyncHandler(getAllLeads)
);
router.get(
  "/:id",
  attachPartner,
  mongoIdParamValidator,
  validate,
  asyncHandler(getLead)
);
router.post(
  "/",
  requirePartner,
  createLeadValidator,
  validate,
  asyncHandler(createLead)
);
router.put(
  "/:id/convert",
  attachPartner,
  mongoIdParamValidator,
  validate,
  asyncHandler(convertToClient)
);
router.put(
  "/:id",
  attachPartner,
  mongoIdParamValidator,
  updateLeadValidator,
  validate,
  asyncHandler(updateLead)
);
router.delete(
  "/:id",
  requireAdmin,
  mongoIdParamValidator,
  validate,
  asyncHandler(deleteLead)
);

export default router;

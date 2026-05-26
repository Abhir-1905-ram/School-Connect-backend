import { Router } from "express";
import {
  getAllPartners,
  getPartner,
  createPartner,
  updatePartner,
  getPartnerStats,
} from "../controllers/partnerController";
import { verifyToken, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { mongoIdParamValidator } from "../validators/common.validator";
import {
  listPartnersQueryValidator,
  createPartnerValidator,
  updatePartnerValidator,
} from "../validators/partner.validator";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(verifyToken, requireAdmin);

router.get("/", listPartnersQueryValidator, validate, asyncHandler(getAllPartners));
router.post("/", createPartnerValidator, validate, asyncHandler(createPartner));
router.get(
  "/:id/stats",
  mongoIdParamValidator,
  validate,
  asyncHandler(getPartnerStats)
);
router.get("/:id", mongoIdParamValidator, validate, asyncHandler(getPartner));
router.put(
  "/:id",
  mongoIdParamValidator,
  updatePartnerValidator,
  validate,
  asyncHandler(updatePartner)
);

export default router;

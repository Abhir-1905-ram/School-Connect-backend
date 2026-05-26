import { Router } from "express";
import {
  register,
  login,
  getMe,
  changePassword,
} from "../controllers/authController";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} from "../validators/auth.validator";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", registerValidator, validate, asyncHandler(register));
router.post("/login", loginValidator, validate, asyncHandler(login));
router.get("/me", verifyToken, asyncHandler(getMe));
router.put(
  "/change-password",
  verifyToken,
  changePasswordValidator,
  validate,
  asyncHandler(changePassword)
);

export default router;

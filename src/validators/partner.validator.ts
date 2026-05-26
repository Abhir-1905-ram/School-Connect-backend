import { body, query } from "express-validator";
import { paginationQueryValidator } from "./common.validator";

export const listPartnersQueryValidator = [
  ...paginationQueryValidator,
  query("search").optional().trim().isLength({ max: 200 }),
  query("city").optional().trim().isLength({ max: 100 }),
  query("area").optional().trim().isLength({ max: 100 }),
  query("sortBy")
    .optional()
    .isIn(["leads", "clients", "revenue", "joinedAt"])
    .withMessage("Invalid sortBy value"),
];

export const createPartnerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must include uppercase, lowercase, and a number"
    ),
  body("city").trim().notEmpty(),
  body("localArea").trim().notEmpty(),
  body("pincode").matches(/^\d{6}$/),
  body("phone").optional().trim(),
  body("designation").optional().trim(),
];

export const updatePartnerValidator = [
  body("city").optional().trim().notEmpty(),
  body("localArea").optional().trim().notEmpty(),
  body("pincode").optional().matches(/^\d{6}$/),
  body("phone").optional().trim(),
  body("designation").optional().trim(),
  body("isActive").optional().isBoolean(),
];

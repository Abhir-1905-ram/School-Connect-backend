import { body, query } from "express-validator";
import { paginationQueryValidator } from "./common.validator";

const targetClassesValidator = body("targetClasses")
  .isArray({ min: 1 })
  .withMessage("targetClasses must be a non-empty array")
  .custom((arr: unknown[]) => {
    if (
      !arr.every(
        (c) => Number.isInteger(c) && (c as number) >= 1 && (c as number) <= 12
      )
    ) {
      throw new Error("Each class must be an integer from 1 to 12");
    }
    return true;
  });

export const listLeadsQueryValidator = [
  ...paginationQueryValidator,
  query("status")
    .optional()
    .isIn(["new", "in_progress", "negotiating", "converted", "lost"])
    .withMessage("Invalid status filter"),
  query("search").optional().trim().isLength({ max: 200 }),
  query("city").optional().trim().isLength({ max: 100 }),
  query("partnerId").optional().trim(),
  query("fromDate").optional().isISO8601().withMessage("fromDate must be a valid date"),
  query("toDate").optional().isISO8601().withMessage("toDate must be a valid date"),
];

export const createLeadValidator = [
  body("schoolName").trim().notEmpty().withMessage("School name is required"),
  body("description").optional().trim().isLength({ max: 500 }),
  body("address").trim().notEmpty().withMessage("Address is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("localArea").optional().trim(),
  body("pincode").optional().trim().matches(/^\d{6}$/).withMessage("Pincode must be 6 digits"),
  body("targetTitle").trim().notEmpty().withMessage("Target title is required"),
  targetClassesValidator,
  body("dealValue")
    .isFloat({ min: 0.01 })
    .withMessage("dealValue must be greater than 0")
    .toFloat(),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

export const updateLeadValidator = [
  body("schoolName").optional().trim().notEmpty(),
  body("description").optional().trim().isLength({ max: 500 }),
  body("address").optional().trim().notEmpty(),
  body("city").optional().trim().notEmpty(),
  body("localArea").optional().trim(),
  body("pincode").optional().trim().matches(/^\d{6}$/),
  body("targetTitle").optional().trim().notEmpty(),
  body("targetClasses")
    .optional()
    .isArray({ min: 1 })
    .custom((arr: unknown[]) => {
      if (
        !arr.every(
          (c) => Number.isInteger(c) && (c as number) >= 1 && (c as number) <= 12
        )
      ) {
        throw new Error("Each class must be an integer from 1 to 12");
      }
      return true;
    }),
  body("dealValue").optional().isFloat({ min: 0.01 }).toFloat(),
  body("status")
    .optional()
    .isIn(["new", "in_progress", "negotiating", "converted", "lost"]),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

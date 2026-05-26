import { body, query } from "express-validator";
import { paginationQueryValidator } from "./common.validator";

export const listClientsQueryValidator = [
  ...paginationQueryValidator,
  query("paymentStatus")
    .optional()
    .isIn(["paid", "unpaid", "partial"])
    .withMessage("Invalid payment status filter"),
  query("search").optional().trim().isLength({ max: 200 }),
  query("city").optional().trim().isLength({ max: 100 }),
  query("partnerId").optional().trim(),
];

export const updateClientValidator = [
  body("schoolName").optional().trim().notEmpty(),
  body("address").optional().trim(),
  body("city").optional().trim(),
  body("targetTitle").optional().trim(),
  body("targetClasses")
    .optional()
    .isArray()
    .custom((arr: unknown[]) => {
      if (
        arr.length > 0 &&
        !arr.every(
          (c) => Number.isInteger(c) && (c as number) >= 1 && (c as number) <= 12
        )
      ) {
        throw new Error("Each class must be an integer from 1 to 12");
      }
      return true;
    }),
  body("dealValue").optional().isFloat({ min: 0 }).toFloat(),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

export const updatePaymentStatusValidator = [
  body("paymentStatus")
    .isIn(["paid", "unpaid", "partial"])
    .withMessage("paymentStatus must be paid, unpaid, or partial"),
  body("amountPaid").optional().isFloat({ min: 0 }).toFloat(),
];

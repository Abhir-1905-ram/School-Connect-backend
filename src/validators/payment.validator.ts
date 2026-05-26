import { body, query } from "express-validator";
import { paginationQueryValidator } from "./common.validator";

export const listPaymentsQueryValidator = [
  ...paginationQueryValidator,
  query("partnerId").optional().trim(),
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
];

export const recordPaymentValidator = [
  body("clientId").isMongoId().withMessage("Valid clientId is required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("amount must be greater than 0")
    .toFloat(),
  body("paymentDate").optional().isISO8601(),
  body("notes").optional().trim().isLength({ max: 500 }),
];

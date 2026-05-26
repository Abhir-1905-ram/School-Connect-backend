import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must include at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("role")
    .isIn(["admin", "partner"])
    .withMessage("Role must be admin or partner"),
  body("city")
    .if(body("role").equals("partner"))
    .trim()
    .notEmpty()
    .withMessage("City is required for partners"),
  body("localArea")
    .if(body("role").equals("partner"))
    .trim()
    .notEmpty()
    .withMessage("Local area is required for partners"),
  body("pincode")
    .if(body("role").equals("partner"))
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),
  body("phone").optional().trim(),
];

export const loginValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

export const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must include uppercase, lowercase, and a number"
    ),
];

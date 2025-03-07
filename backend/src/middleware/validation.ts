import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { HttpStatus } from "../types/http";
import { Messages } from "../constants/messages";

export const validateRegistration = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("name").notEmpty().withMessage("Name is required"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: Messages.GENERAL.VALIDATION_ERROR,
        errors: errors.array(),
      });
    }
    return next();
  },
];

export const validateLogin = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: Messages.GENERAL.VALIDATION_ERROR,
        errors: errors.array(),
      });
    }
    return next();
  },
];

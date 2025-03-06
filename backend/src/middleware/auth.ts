import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { HttpStatus } from "../types/http";
import { Messages } from "../constants/messages";

const authService = new AuthService();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: Messages.AUTH.UNAUTHORIZED,
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: Messages.AUTH.INVALID_TOKEN,
    });
  }
};

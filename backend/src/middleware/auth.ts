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
    console.log("Auth headers:", req.headers); // Debug log
    const authHeader = req.headers.authorization;
    console.log("Authorization header:", authHeader); // Debug log

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("No valid auth header found"); // Debug log
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: Messages.AUTH.UNAUTHORIZED,
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted token:", token); // Debug log
    try {
      const decoded = authService.verifyToken(token);
      console.log("Decoded token:", decoded); // Debug log

      if (!decoded || !decoded.id) {
        console.error("Invalid token payload:", decoded); // Debug log
        throw new Error("Invalid token payload");
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
      };
      console.log("Set user in request:", req.user); // Debug log
      next();
    } catch (tokenError) {
      console.error("Token verification error:", tokenError); // Debug log
      throw tokenError;
    }
  } catch (error) {
    console.error("Auth error:", error); // Debug log
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: Messages.AUTH.INVALID_TOKEN,
    });
  }
};

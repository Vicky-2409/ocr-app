import { Response, NextFunction } from "express";
import { OcrService } from "../services/OcrService";
import { HttpStatus } from "../types/http";
import { Messages } from "../constants/messages";
import { AuthenticatedRequest } from "../types/auth";
import { IOcrResult } from "../models/OcrResult";

// Utility function to transform MongoDB document to frontend format
const transformOcrResult = (result: IOcrResult) => {
  // Handle both Mongoose documents and plain objects
  const plainResult = result.toObject ? result.toObject() : result;
  const { _id, userId, ...rest } = plainResult;
  return {
    id: _id.toString(),
    userId: userId.toString(),
    ...rest,
  };
};

export class OcrController {
  private ocrService: OcrService;

  constructor() {
    this.ocrService = new OcrService();
  }

  async processImage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      console.log("Processing image request:", {
        files: req.files,
        file: req.file
          ? {
              fieldname: req.file.fieldname,
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
              buffer: req.file.buffer ? "Present" : "Missing",
            }
          : "No file",
        body: req.body,
        headers: req.headers,
      });

      if (!req.file) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "No file uploaded",
        });
        return;
      }

      // Validate file object
      if (!req.file.buffer || !req.file.mimetype) {
        console.error("Invalid file object:", {
          buffer: req.file.buffer ? "Present" : "Missing",
          mimetype: req.file.mimetype,
          fieldname: req.file.fieldname,
        });
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid file format or corrupted file",
        });
        return;
      }

      // Validate file type
      if (
        !["image/jpeg", "image/png", "image/jpg"].includes(req.file.mimetype)
      ) {
        console.error("Invalid file type:", {
          receivedType: req.file.mimetype,
          allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
          fieldname: req.file.fieldname,
        });
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid file type. Only JPEG and PNG images are allowed",
        });
        return;
      }

      // Validate file size (5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        console.error("File too large:", {
          size: req.file.size,
          maxSize: 5 * 1024 * 1024,
          fieldname: req.file.fieldname,
        });
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "File size exceeds 5MB limit",
        });
        return;
      }

      const result = await this.ocrService.processImage(req.user.id, req.file);
      res.status(HttpStatus.OK).json({
        success: true,
        data: transformOcrResult(result),
      });
    } catch (error) {
      console.error("Error in processImage:", {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : error,
      });

      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          res.status(HttpStatus.GATEWAY_TIMEOUT).json({
            success: false,
            message: "OCR processing timed out",
          });
          return;
        }

        if (error.message.includes("No file key")) {
          res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: "Invalid file upload. Please try again.",
          });
          return;
        }
      }
      next(error);
    }
  }

  async getUserResults(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const results = await this.ocrService.getUserResults(req.user.id);
      res.status(HttpStatus.OK).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteResult(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      console.log("Delete request received:", {
        id: req.params.id,
        userId: req.user.id,
      });

      if (!req.params.id || req.params.id === "undefined") {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid result ID",
        });
        return;
      }

      const result = await this.ocrService.getResultById(req.params.id);
      if (!result) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: Messages.GENERAL.NOT_FOUND,
        });
        return;
      }

      // Check if the result belongs to the user
      if (result.userId.toString() !== req.user.id) {
        console.log("Unauthorized delete attempt:", {
          resultUserId: result.userId.toString(),
          requestUserId: req.user.id,
        });
        res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: Messages.GENERAL.UNAUTHORIZED,
        });
        return;
      }

      await this.ocrService.deleteResult(req.params.id);
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Result deleted successfully",
      });
    } catch (error) {
      console.error("Error in deleteResult:", error);
      if (error instanceof Error) {
        if (error.message === "Result not found") {
          res.status(HttpStatus.NOT_FOUND).json({
            success: false,
            message: Messages.GENERAL.NOT_FOUND,
          });
          return;
        }
        if (error.message === "Invalid result ID") {
          res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: "Invalid result ID",
          });
          return;
        }
      }
      next(error);
    }
  }

  async getResultById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.ocrService.getResultById(req.params.id);

      if (!result) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: Messages.GENERAL.NOT_FOUND,
        });
        return;
      }

      res.status(HttpStatus.OK).json({
        success: true,
        message: Messages.GENERAL.SUCCESS,
        data: transformOcrResult(result),
      });
    } catch (error) {
      next(error);
    }
  }
}

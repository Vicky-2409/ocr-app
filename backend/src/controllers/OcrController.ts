import { Request, Response, NextFunction } from "express";
import { OcrService } from "../services/OcrService";
import { HttpStatus } from "../types/http";
import { Messages } from "../constants/messages";
import { AuthRequest } from "../middleware/auth";
import { IOcrResult } from "../models/OcrResult";
import { AuthenticatedRequest } from "../types/auth";

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
      if (!req.file) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "No file uploaded",
        });
        return;
      }

      const result = await this.ocrService.processImage(req.user.id, req.file);
      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        res.status(HttpStatus.GATEWAY_TIMEOUT).json({
          success: false,
          message: "OCR processing timed out",
        });
        return;
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
      await this.ocrService.deleteResult(req.params.id);
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Result deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  getResultById = async (req: AuthRequest, res: Response): Promise<void> => {
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
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : Messages.GENERAL.SERVER_ERROR,
      });
    }
  };
}

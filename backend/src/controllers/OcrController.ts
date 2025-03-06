import { Request, Response } from "express";
import { OcrService } from "../services/OcrService";
import { HttpStatus } from "../types/http";
import { Messages } from "../constants/messages";
import { AuthRequest } from "../middleware/auth";
import { IOcrResult } from "../models/OcrResult";

// Utility function to transform MongoDB document to frontend format
const transformOcrResult = (result: IOcrResult) => {
  const { _id, userId, ...rest } = result.toObject();
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

  processImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: Messages.OCR.INVALID_FILE,
        });
        return;
      }

      const result = await this.ocrService.processImage(req.user!.id, req.file);

      res.status(HttpStatus.OK).json({
        success: true,
        message: Messages.OCR.SUCCESS,
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

  getUserResults = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        console.error("No user ID found in request");
        res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: Messages.AUTH.UNAUTHORIZED,
        });
        return;
      }

      console.log("Getting results for user:", req.user.id);
      const results = await this.ocrService.getUserResults(req.user.id);
      console.log(`Successfully retrieved ${results.length} results for user`);

      res.status(HttpStatus.OK).json({
        success: true,
        message: Messages.GENERAL.SUCCESS,
        data: results.map(transformOcrResult),
      });
    } catch (error) {
      console.error("Error getting user results:", error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : Messages.GENERAL.SERVER_ERROR,
      });
    }
  };

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

  deleteResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await this.ocrService.getResultById(req.params.id);

      if (!result) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: Messages.GENERAL.NOT_FOUND,
        });
        return;
      }

      // Check if the result belongs to the user
      if (result.userId.toString() !== req.user!.id) {
        res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: Messages.GENERAL.UNAUTHORIZED,
        });
        return;
      }

      await this.ocrService.deleteResult(req.params.id);

      res.status(HttpStatus.OK).json({
        success: true,
        message: Messages.GENERAL.SUCCESS,
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

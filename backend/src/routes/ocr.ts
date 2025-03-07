import { Router, RequestHandler } from "express";
import { OcrController } from "../controllers/OcrController";
import { authenticate } from "../middleware/auth";
import { upload, handleUploadError } from "../middleware/upload";
import { AuthenticatedRequest } from "../types/auth";

const router = Router();
const ocrController = new OcrController();

// Apply authentication to all routes
router.use(authenticate);

// File upload route
router.post("/process", upload.single("image"), handleUploadError, (async (
  req,
  res,
  next
) => {
  try {
    return await ocrController.processImage(
      req as AuthenticatedRequest,
      res,
      next
    );
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

router.get("/results", (async (req, res, next) => {
  try {
    return await ocrController.getUserResults(
      req as AuthenticatedRequest,
      res,
      next
    );
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

router.get("/results/:id", (async (req, res, next) => {
  try {
    return await ocrController.getResultById(
      req as AuthenticatedRequest,
      res,
      next
    );
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

router.delete("/results/:id", (async (req, res, next) => {
  try {
    return await ocrController.deleteResult(
      req as AuthenticatedRequest,
      res,
      next
    );
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

export default router;

import { Router, Response, NextFunction } from "express";
import { OcrController } from "../controllers/OcrController";
import { authenticate } from "../middleware/auth";
import { upload, handleUploadError } from "../middleware/upload";
import { AuthenticatedRequest } from "../types/auth";

const router = Router();
const ocrController = new OcrController();

// Apply authentication to all routes
router.use(authenticate);

// File upload route
router.post(
  "/process",
  upload.single("image"),
  handleUploadError,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    ocrController.processImage(req, res, next)
);

router.get(
  "/results",
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    ocrController.getUserResults(req, res, next)
);

router.get(
  "/results/:id",
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    ocrController.getResultById(req, res, next)
);

router.delete(
  "/results/:id",
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    ocrController.deleteResult(req, res, next)
);

export default router;

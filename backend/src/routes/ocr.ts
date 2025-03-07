import { Router } from "express";
import { OcrController } from "../controllers/OcrController";
import { authenticate } from "../middleware/auth";
import { upload, handleUploadError } from "../middleware/upload";

const router = Router();
const ocrController = new OcrController();

// Apply authentication to all routes
router.use(authenticate);

// File upload route
router.post(
  "/process",
  upload.single("image"),
  handleUploadError,
  (req, res, next) => ocrController.processImage(req, res, next)
);

router.get("/results", (req, res, next) =>
  ocrController.getUserResults(req, res, next)
);
router.get("/results/:id", (req, res, next) =>
  ocrController.getResultById(req, res, next)
);
router.delete("/results/:id", (req, res, next) =>
  ocrController.deleteResult(req, res, next)
);

export default router;

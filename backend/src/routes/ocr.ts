import { Router } from "express";
import { OcrController } from "../controllers/OcrController";
import { authenticate } from "../middleware/auth";
import { upload, handleUploadError } from "../middleware/upload";

const router = Router();
const ocrController = new OcrController();

// Apply authentication to all routes except file upload
router.use("/results", authenticate);
router.use("/results/:id", authenticate);

// File upload route with authentication
router.post(
  "/process",
  upload.single("image"),
  handleUploadError,
  authenticate,
  ocrController.processImage
);

router.get("/results", ocrController.getUserResults);
router.get("/results/:id", ocrController.getResultById);
router.delete("/results/:id", ocrController.deleteResult);

export default router;

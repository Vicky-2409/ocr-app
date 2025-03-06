import { Router } from "express";
import { OcrController } from "../controllers/OcrController";
import { authenticate } from "../middleware/auth";
import { upload, handleUploadError } from "../middleware/upload";

const router = Router();
const ocrController = new OcrController();

router.use(authenticate);

router.post(
  "/process",
  upload.single("image"),
  handleUploadError,
  ocrController.processImage
);
router.get("/results", ocrController.getUserResults);
router.get("/results/:id", ocrController.getResultById);
router.delete("/results/:id", ocrController.deleteResult);

export default router;

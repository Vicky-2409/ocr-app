import { Router } from "express";
import authRoutes from "./auth";
import ocrRoutes from "./ocr";

const router = Router();

router.use("/auth", authRoutes);
router.use("/ocr", ocrRoutes);

export { router };

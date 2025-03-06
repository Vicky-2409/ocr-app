import multer from "multer";
import multerS3 from "multer-s3";
import { Request, Response, NextFunction } from "express";
import { HttpStatus } from "../types/http";
import { Messages } from "../constants/messages";
import { s3Client, S3_BUCKET_NAME } from "../config/aws";

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
    "image/jpeg",
    "image/png",
  ];
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10); // 5MB default

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error(Messages.OCR.INVALID_FILE));
    return;
  }

  if (file.size > maxSize) {
    cb(new Error(Messages.OCR.FILE_TOO_LARGE));
    return;
  }

  cb(null, true);
};

const storage = multerS3({
  s3: s3Client,
  bucket: S3_BUCKET_NAME,
  key: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: any, key?: string) => void
  ) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + file.originalname);
  },
});

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10),
  },
});

export const handleUploadError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: Messages.OCR.FILE_TOO_LARGE,
      });
    }
  }

  if (err.message === Messages.OCR.INVALID_FILE) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: Messages.OCR.INVALID_FILE,
    });
  }

  if (err.message === Messages.OCR.FILE_TOO_LARGE) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: Messages.OCR.FILE_TOO_LARGE,
    });
  }

  next(err);
};

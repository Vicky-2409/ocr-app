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
  console.log("Processing file:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
    "image/jpeg",
    "image/png",
  ];
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10); // 10MB default

  if (!allowedTypes.includes(file.mimetype)) {
    console.error("Invalid file type:", file.mimetype);
    cb(new Error(Messages.OCR.INVALID_FILE));
    return;
  }

  if (file.size > maxSize) {
    console.error("File too large:", file.size, "bytes");
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
    const key = uniqueSuffix + "-" + file.originalname;
    console.log("Generated S3 key:", key);
    cb(null, key);
  },
  contentType: (req, file, cb) => {
    cb(null, file.mimetype);
  },
  metadata: (req, file, cb) => {
    cb(null, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size.toString(),
    });
  },
});

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB
  },
});

export const handleUploadError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Upload error:", err);

  if (err instanceof multer.MulterError) {
    console.error("Multer error:", {
      code: err.code,
      field: err.field,
      message: err.message,
    });

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

  // Handle S3 errors
  if (err.message.includes("S3")) {
    console.error("S3 error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error uploading file to storage. Please try again.",
    });
  }

  next(err);
};

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
    buffer: file.buffer ? "Buffer present" : "No buffer",
    fieldname: file.fieldname,
  });

  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10); // 10MB default

  console.log("File validation details:", {
    allowedTypes,
    maxSize,
    actualType: file.mimetype,
    actualSize: file.size,
    isTypeValid: allowedTypes.includes(file.mimetype),
    isSizeValid: file.size <= maxSize,
    fieldname: file.fieldname,
  });

  if (!file.mimetype) {
    console.error("No mimetype in file");
    cb(new Error("Invalid file: missing mimetype"));
    return;
  }

  if (!allowedTypes.includes(file.mimetype)) {
    console.error("Invalid file type:", {
      receivedType: file.mimetype,
      allowedTypes,
      fieldname: file.fieldname,
    });
    cb(
      new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`)
    );
    return;
  }

  if (file.size > maxSize) {
    console.error("File too large:", {
      size: file.size,
      maxSize,
      fieldname: file.fieldname,
    });
    cb(new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`));
    return;
  }

  cb(null, true);
};

const storage = multerS3({
  s3: s3Client,
  bucket: S3_BUCKET_NAME,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const key = uniqueSuffix + "-" + file.originalname;
    console.log("Generated S3 key:", key);
    cb(null, key);
  },
  contentType: function (req, file, cb) {
    cb(null, file.mimetype);
  },
  acl: "public-read",
});

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB default
    files: 1, // Allow only 1 file
  },
});

export const handleUploadError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("File upload error:", {
    message: err.message,
    code: err.code,
    field: err.field,
    stack: err.stack,
  });

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
      });
    }
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err.message.includes("Invalid file type")) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "Please upload a valid image file (JPEG, JPG, or PNG)",
    });
  }

  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Error uploading file. Please try again.",
  });
};

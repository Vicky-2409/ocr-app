import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { HttpStatus } from "../types/http";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "../config/aws";
import { v4 as uuidv4 } from "uuid";

const fileFilter = (
  _req: Request,
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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB default
  },
});

// Upload file to S3
const uploadToS3 = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    const file = req.file;
    const key = `${uuidv4()}-${file.originalname.replace(/\s+/g, "-")}`;

    console.log("Uploading to S3:", {
      bucket: S3_BUCKET_NAME,
      key,
      contentType: file.mimetype,
      size: file.size,
    });

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    // Add S3 info to the file object
    (req.file as any).key = key;
    (req.file as any).bucket = S3_BUCKET_NAME;
    (
      req.file as any
    ).location = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log("Successfully uploaded to S3:", {
      key,
      location: (req.file as any).location,
    });

    next();
  } catch (error) {
    console.error("Error uploading to S3:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to upload file to storage",
    });
  }
};

// Handle multer errors
const handleUploadError = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
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

export { upload, uploadToS3, handleUploadError };

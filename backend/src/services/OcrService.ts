import { createWorker } from "tesseract.js";
import { IOcrResult, OcrResult } from "../models/OcrResult";
import { OcrResultRepository } from "../repositories/OcrResultRepository";
import { Messages } from "../constants/messages";
import { Types } from "mongoose";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "../config/aws";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface S3File extends Express.Multer.File {
  key?: string;
  location?: string;
  bucket?: string;
  mimetype: string;
  size: number;
  encoding: string;
  fieldname: string;
  originalname: string;
  buffer?: Buffer;
  stream?: any; // Use any type to avoid TypeScript errors with stream types
}

const isDevelopment = process.env.NODE_ENV !== "production";

export class OcrService {
  private ocrResultRepository: OcrResultRepository;

  constructor() {
    this.ocrResultRepository = new OcrResultRepository();
  }

  async processImage(userId: string, imageFile: S3File): Promise<IOcrResult> {
    const startTime = Date.now();
    let extractedText = "";
    let status: "success" | "failed" = "success";
    let error: string | undefined;
    let worker;
    let retryCount = 0;
    const maxRetries = 3;

    try {
      console.log("Starting OCR processing for user:", userId);
      console.log("Image file details:", {
        originalname: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size,
        key: imageFile.key,
        fieldname: imageFile.fieldname,
        encoding: imageFile.encoding,
        stream: imageFile.stream ? "Present" : "Missing",
      });

      // Verify AWS configuration
      console.log("Verifying AWS configuration...");
      console.log("S3 Bucket:", S3_BUCKET_NAME);
      console.log("AWS Region:", process.env.AWS_REGION);

      if (!imageFile.key) {
        console.error("No file key found in uploaded file");
        throw new Error("No file key found in uploaded file");
      }

      // Create worker with increased timeout for free tier
      console.log("Creating OCR worker...");
      retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to create worker`);
          worker = await createWorker();
          console.log("Worker created successfully");
          break;
        } catch (err) {
          retryCount++;
          console.error(`Worker creation attempt ${retryCount} failed:`, err);
          if (retryCount === maxRetries) {
            throw new Error(
              `Failed to create worker after ${maxRetries} attempts: ${err.message}`
            );
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 2000 * retryCount)
          );
        }
      }

      // Load language with timeout and retry
      console.log("Loading English language...");
      retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to load language`);
          await worker.loadLanguage("eng");
          console.log("Language loaded successfully");
          break;
        } catch (err) {
          retryCount++;
          console.error(`Language loading attempt ${retryCount} failed:`, err);
          if (retryCount === maxRetries) throw err;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        }
      }

      // Initialize with timeout and retry
      console.log("Initializing worker...");
      retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to initialize worker`);
          await worker.initialize("eng");
          console.log("Worker initialized successfully");
          break;
        } catch (err) {
          retryCount++;
          console.error(
            `Worker initialization attempt ${retryCount} failed:`,
            err
          );
          if (retryCount === maxRetries) throw err;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        }
      }

      // Get the image from S3
      console.log("Getting image from S3...");
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: imageFile.key,
      });

      try {
        const { Body } = await s3Client.send(command);
        if (!Body) {
          throw new Error("No image data received from S3");
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of Body as any) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Recognize text with progress tracking and timeout
        console.log("Starting OCR processing...");
        try {
          const result = await worker.recognize(buffer, {
            logger: (m) => {
              console.log(`OCR Progress: ${m.status} - ${m.progress * 100}%`);
            },
          });

          if (!result?.data?.text) {
            throw new Error("No text extracted from image");
          }

          extractedText = result.data.text;
          console.log("OCR processing completed successfully");
          console.log("Extracted text length:", extractedText.length);
        } catch (err) {
          console.error("Error during OCR recognition:", err);
          throw err;
        }
      } catch (err) {
        console.error("Error getting image from S3:", err);
        throw err;
      }

      // Terminate worker
      console.log("Terminating worker...");
      await worker.terminate();
      console.log("Worker terminated successfully");

      const processingTime = Date.now() - startTime;
      console.log(`Total processing time: ${processingTime}ms`);

      // Save the result
      console.log("Saving OCR result...");
      const result = await this.ocrResultRepository.create({
        userId: new Types.ObjectId(userId),
        originalImage: imageFile.key,
        imageUrl: `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageFile.key}`,
        extractedText,
        status,
        processingTime,
      } as IOcrResult);

      console.log("OCR result saved successfully");
      return result;
    } catch (err: unknown) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
      console.error("OCR processing error:", {
        error,
        userId,
        processingTime: Date.now() - startTime,
        stack: err instanceof Error ? err.stack : undefined,
        fileDetails: {
          originalname: imageFile.originalname,
          mimetype: imageFile.mimetype,
          size: imageFile.size,
          key: imageFile.key,
        },
      });

      // Ensure worker is terminated even if there's an error
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.error("Error terminating worker:", terminateError);
        }
      }

      // Create a failed result entry
      try {
        const result = await this.ocrResultRepository.create({
          userId: new Types.ObjectId(userId),
          originalImage: imageFile.key || imageFile.originalname,
          imageUrl: `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageFile.key}`,
          extractedText: "Error processing image",
          status,
          error,
          processingTime: Date.now() - startTime,
        } as IOcrResult);
        return result;
      } catch (saveError) {
        console.error("Error saving failed OCR result:", saveError);
        throw new Error("Failed to save OCR result");
      }
    }
  }

  async getUserResults(userId: string): Promise<IOcrResult[]> {
    try {
      console.log("Getting results for user ID:", userId);
      const results = await this.ocrResultRepository.findByUserId(
        new Types.ObjectId(userId)
      );
      console.log(`Found ${results.length} results for user`);

      if (!results || results.length === 0) {
        console.log("No results found for user");
        return [];
      }

      // Generate fresh signed URLs for each result
      const resultsWithFreshUrls = await Promise.all(
        results.map(async (result) => {
          try {
            // Ensure we have a valid result object
            if (!result || !result.originalImage) {
              console.error("Invalid result object:", result);
              return null;
            }

            const command = new GetObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: result.originalImage,
            });
            const freshImageUrl = await getSignedUrl(s3Client, command, {
              expiresIn: 3600,
            });
            return {
              ...result,
              imageUrl: freshImageUrl,
            };
          } catch (error) {
            console.error(
              `Error generating signed URL for image ${result.originalImage}:`,
              error
            );
            // Return the result with the original URL if signing fails
            return {
              ...result,
              imageUrl: result.imageUrl,
            };
          }
        })
      );

      // Filter out any null results and return
      return resultsWithFreshUrls.filter(
        (result): result is IOcrResult => result !== null
      );
    } catch (error) {
      console.error("Error in getUserResults:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  async getResultById(id: string): Promise<IOcrResult | null> {
    return this.ocrResultRepository.findById(id);
  }

  async deleteResult(id: string): Promise<void> {
    const result = await this.getResultById(id);
    if (result) {
      // Delete the image from S3
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: result.originalImage,
      });

      try {
        await s3Client.send(command);
      } catch (error) {
        if (isDevelopment) {
          console.error("Error deleting file from S3:", error);
        }
      }

      await this.ocrResultRepository.delete(id);
    }
  }
}

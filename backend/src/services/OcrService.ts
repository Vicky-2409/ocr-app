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
  buffer: Buffer;
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

    try {
      console.log("Starting OCR processing for user:", userId);

      // Create worker with timeout
      const workerPromise = createWorker();
      worker = await Promise.race([
        workerPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Worker creation timeout")), 30000)
        ),
      ]);

      console.log("Worker created successfully");

      // Load language with timeout
      await Promise.race([
        worker.loadLanguage("eng"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Language loading timeout")), 30000)
        ),
      ]);
      console.log("Language loaded successfully");

      // Initialize with timeout
      await Promise.race([
        worker.initialize("eng"),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Worker initialization timeout")),
            30000
          )
        ),
      ]);
      console.log("Worker initialized successfully");

      // Get the image from S3 with timeout
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: imageFile.key,
      });

      const url = await Promise.race([
        getSignedUrl(s3Client, command, { expiresIn: 3600 }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("S3 URL generation timeout")),
            30000
          )
        ),
      ]);
      console.log("S3 URL generated successfully");

      // Recognize text with progress tracking and timeout
      const result = await Promise.race([
        worker.recognize(url, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`OCR Progress: ${m.progress * 100}%`);
            }
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("OCR processing timeout")), 180000)
        ),
      ]);
      extractedText = result.data.text;
      console.log("OCR processing completed successfully");

      // Terminate worker
      await worker.terminate();
      console.log("Worker terminated successfully");
    } catch (err: unknown) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
      console.error("OCR processing error:", error);

      // Ensure worker is terminated even if there's an error
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.error("Error terminating worker:", terminateError);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`Total processing time: ${processingTime}ms`);

    // Get the S3 URL for the image with timeout
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: imageFile.key || imageFile.originalname,
      });
      const imageUrl = await Promise.race([
        getSignedUrl(s3Client, command, { expiresIn: 3600 }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Final S3 URL generation timeout")),
            30000
          )
        ),
      ]);

      const result = await this.ocrResultRepository.create({
        userId: new Types.ObjectId(userId),
        originalImage: imageFile.key || imageFile.originalname,
        imageUrl,
        extractedText,
        status,
        error: error || undefined,
        processingTime,
      } as IOcrResult);
      console.log("OCR result saved successfully");
      return result;
    } catch (err) {
      console.error("Error saving OCR result:", err);
      throw new Error("Failed to save OCR result");
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

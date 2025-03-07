import { createWorker, Worker } from "tesseract.js";
import { IOcrResult } from "../models/OcrResult";
import { OcrResultRepository } from "../repositories/OcrResultRepository";
import { Types } from "mongoose";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "../config/aws";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

interface S3File extends Omit<Express.Multer.File, "stream"> {
  key?: string;
  location?: string;
  bucket?: string;
  stream: Readable;
  buffer: Buffer;
  mimetype: string;
  size: number;
  encoding: string;
  fieldname: string;
  originalname: string;
}

const isDevelopment = process.env.NODE_ENV !== "production";

export class OcrService {
  private ocrResultRepository: OcrResultRepository;
  private worker: Worker | null = null;

  constructor() {
    this.ocrResultRepository = new OcrResultRepository();
  }

  private async initializeWorker(): Promise<void> {
    try {
      if (!this.worker) {
        this.worker = await createWorker();
        await this.worker.reinitialize("eng");
        console.log("Tesseract worker initialized successfully");
      }
    } catch (err) {
      console.error("Error initializing Tesseract worker:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      throw new Error(`Failed to initialize OCR worker: ${errorMessage}`);
    }
  }

  private async terminateWorker(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
        console.log("Tesseract worker terminated successfully");
      }
    } catch (err) {
      console.error("Error terminating Tesseract worker:", err);
      // Don't throw here as this is cleanup code
    }
  }

  async processImage(userId: string, imageFile: S3File): Promise<IOcrResult> {
    const startTime = Date.now();
    let extractedText = "";
    let status: "success" | "failed" = "success";
    let error: string | undefined;

    try {
      console.log("Starting OCR processing for user:", userId);
      console.log("Image file details:", {
        originalname: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size,
        key: imageFile.key,
        location: imageFile.location,
        fieldname: imageFile.fieldname,
        encoding: imageFile.encoding,
      });

      // Initialize worker if not already initialized
      await this.initializeWorker();
      if (!this.worker) {
        throw new Error("Worker initialization failed");
      }

      // Process the image buffer directly since we already have it
      console.log("Starting OCR processing...");
      try {
        const result = await this.worker.recognize(imageFile.buffer);
        console.log("OCR processing completed");

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

      const processingTime = Date.now() - startTime;
      console.log(`Total processing time: ${processingTime}ms`);

      // Save the result
      console.log("Saving OCR result...");
      const result = await this.ocrResultRepository.create({
        userId: new Types.ObjectId(userId),
        originalImage: imageFile.originalname,
        imageUrl: imageFile.location,
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
          location: imageFile.location,
        },
      });

      // Create a failed result entry
      try {
        const result = await this.ocrResultRepository.create({
          userId: new Types.ObjectId(userId),
          originalImage: imageFile.originalname,
          imageUrl: imageFile.location,
          extractedText: "Error processing image",
          status,
          error,
          processingTime: Date.now() - startTime,
        } as IOcrResult);
        return result;
      } catch (saveError) {
        console.error("Error saving failed OCR result:", saveError);
        throw new Error("Failed to save OCR result");
      } finally {
        await this.terminateWorker();
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

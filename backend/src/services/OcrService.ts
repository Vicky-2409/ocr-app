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
        originalImage: imageFile.key,
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
          originalImage: imageFile.key,
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
            // Ensure we have a valid result object and S3 key
            if (!result || !result.originalImage) {
              console.error("Invalid result object:", result);
              return null;
            }

            // Generate a signed URL for the image
            const command = new GetObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: result.originalImage,
            });

            try {
              const freshImageUrl = await getSignedUrl(s3Client, command, {
                expiresIn: 3600,
              });

              return {
                ...result,
                imageUrl: freshImageUrl,
              };
            } catch (signError) {
              console.error("Error generating signed URL:", signError);
              // If we can't generate a signed URL, use the stored URL
              return {
                ...result,
                imageUrl: result.imageUrl,
              };
            }
          } catch (error) {
            console.error(
              `Error processing result for image ${result.originalImage}:`,
              error
            );
            return null;
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
    try {
      // Validate if the ID is a valid MongoDB ObjectId
      if (!Types.ObjectId.isValid(id)) {
        throw new Error("Invalid result ID format");
      }
      return this.ocrResultRepository.findById(id);
    } catch (error) {
      console.error("Error in getResultById:", error);
      throw error;
    }
  }

  async deleteResult(id: string): Promise<void> {
    console.log("Attempting to delete result:", id);

    if (!id || id === "undefined") {
      throw new Error("Invalid result ID");
    }

    // Validate if the ID is a valid MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid result ID format");
    }

    const result = await this.getResultById(id);
    if (!result) {
      throw new Error("Result not found");
    }

    console.log("Found result to delete:", {
      id: result._id,
      originalImage: result.originalImage,
      userId: result.userId,
    });

    // Delete the image from S3 if we have a key
    if (result.originalImage) {
      try {
        console.log("Deleting image from S3:", {
          bucket: S3_BUCKET_NAME,
          key: result.originalImage,
        });

        const command = new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: result.originalImage,
        });

        await s3Client.send(command);
        console.log("Successfully deleted image from S3");
      } catch (error) {
        console.error("Error deleting file from S3:", error);
        // Don't throw here, continue with deleting the database record
      }
    }

    // Delete the database record
    try {
      await this.ocrResultRepository.delete(id);
      console.log("Successfully deleted result from database");
    } catch (error) {
      console.error("Error deleting result from database:", error);
      throw new Error("Failed to delete result");
    }
  }
}

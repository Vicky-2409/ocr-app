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
      });

      if (!imageFile.key) {
        console.error("No file key found in uploaded file");
        throw new Error("No file key found in uploaded file");
      }

      if (!imageFile.buffer || imageFile.buffer.length === 0) {
        console.error("No file buffer found in uploaded file");
        throw new Error("No file buffer found in uploaded file");
      }

      // Create worker with timeout and retry
      console.log("Creating OCR worker...");
      retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to create worker`);
          const workerPromise = createWorker();

          worker = await Promise.race([
            workerPromise,
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Worker creation timeout")),
                60000
              )
            ),
          ]);
          console.log("Worker created successfully");
          break;
        } catch (err) {
          retryCount++;
          console.error(`Worker creation attempt ${retryCount} failed:`, err);
          if (retryCount === maxRetries) throw err;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        }
      }

      // Load language with timeout and retry
      console.log("Loading English language...");
      retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to load language`);
          await Promise.race([
            worker.loadLanguage("eng"),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Language loading timeout")),
                60000
              )
            ),
          ]);
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
          await Promise.race([
            worker.initialize("eng"),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Worker initialization timeout")),
                60000
              )
            ),
          ]);
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

      // Get the image from S3 with timeout and retry
      console.log("Generating S3 URL...");
      retryCount = 0;
      let url: string | undefined;
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to generate S3 URL`);
          const command = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: imageFile.key,
          });
          const signedUrl = await Promise.race([
            getSignedUrl(s3Client, command, { expiresIn: 3600 }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("S3 URL generation timeout")),
                60000
              )
            ),
          ]);
          if (typeof signedUrl === "string") {
            url = signedUrl;
            console.log("S3 URL generated successfully");
          } else {
            console.error("Invalid signed URL type:", typeof signedUrl);
          }
          break;
        } catch (err) {
          retryCount++;
          console.error(`S3 URL generation attempt ${retryCount} failed:`, err);
          if (retryCount === maxRetries) throw err;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        }
      }

      if (!url) {
        console.error("Failed to generate S3 URL after all attempts");
        throw new Error("Failed to generate S3 URL");
      }

      // Recognize text with progress tracking and timeout
      console.log("Starting OCR processing...");
      try {
        const result = await Promise.race([
          worker.recognize(url, {
            logger: (m) => {
              console.log(`OCR Progress: ${m.status} - ${m.progress * 100}%`);
            },
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("OCR processing timeout")),
              300000
            )
          ),
        ]);
        extractedText = result.data.text;
        console.log("OCR processing completed successfully");
        console.log("Extracted text length:", extractedText.length);
      } catch (err) {
        console.error("Error during OCR recognition:", err);
        throw err;
      }

      // Terminate worker
      console.log("Terminating worker...");
      await worker.terminate();
      console.log("Worker terminated successfully");
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
    }

    const processingTime = Date.now() - startTime;
    console.log(`Total processing time: ${processingTime}ms`);

    // Get the S3 URL for the image with timeout and retry
    try {
      console.log("Generating final S3 URL...");
      retryCount = 0;
      let imageUrl: string | undefined;
      while (retryCount < maxRetries) {
        try {
          const command = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: imageFile.key || imageFile.originalname,
          });
          const signedUrl = await Promise.race([
            getSignedUrl(s3Client, command, { expiresIn: 3600 }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Final S3 URL generation timeout")),
                60000
              )
            ),
          ]);
          if (typeof signedUrl === "string") {
            imageUrl = signedUrl;
          }
          console.log("Final S3 URL generated successfully");
          break;
        } catch (err) {
          retryCount++;
          console.error(
            `Final S3 URL generation attempt ${retryCount} failed:`,
            err
          );
          if (retryCount === maxRetries) throw err;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        }
      }

      if (!imageUrl) {
        throw new Error("Failed to generate final S3 URL");
      }

      console.log("Saving OCR result...");
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

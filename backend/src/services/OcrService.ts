import { createWorker } from "tesseract.js";
import { IOcrResult, OcrResult } from "../models/OcrResult";
import { OcrResultRepository } from "../repositories/OcrResultRepository";
import { Messages } from "../constants/messages";
import { Types } from "mongoose";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "../config/aws";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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
      console.log("Starting OCR process...");
      console.log("Image details:", {
        mimetype: imageFile.mimetype,
        size: imageFile.size,
        originalname: imageFile.originalname,
        key: imageFile.key,
      });

      // Create worker
      worker = await createWorker();
      console.log("Worker created successfully");

      // Get the image from S3
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: imageFile.key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log("Got signed URL for image");

      // Recognize text
      console.log("Starting text recognition...");
      const result = await worker.recognize(url);
      console.log("Text recognition completed");

      extractedText = result.data.text;
      console.log("Extracted text length:", extractedText.length);

      // Terminate worker
      await worker.terminate();
      console.log("Worker terminated successfully");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorName = err instanceof Error ? err.name : "Unknown";
      const errorStack = err instanceof Error ? err.stack : undefined;

      console.error("Detailed OCR Error:", {
        name: errorName,
        message: errorMessage,
        stack: errorStack,
      });

      status = "failed";
      error = errorMessage;

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
    console.log("Total processing time:", processingTime, "ms");

    return this.ocrResultRepository.create({
      userId: new Types.ObjectId(userId),
      originalImage: imageFile.key || imageFile.originalname,
      extractedText,
      status,
      error,
      processingTime,
    });
  }

  async getUserResults(userId: string): Promise<IOcrResult[]> {
    return this.ocrResultRepository.findByUserId(new Types.ObjectId(userId));
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
        console.error("Error deleting file from S3:", error);
      }

      await this.ocrResultRepository.delete(id);
    }
  }
}

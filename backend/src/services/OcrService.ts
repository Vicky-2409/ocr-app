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
      // Create worker
      worker = await createWorker();

      // Get the image from S3
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: imageFile.key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      // Recognize text
      const result = await worker.recognize(url);
      extractedText = result.data.text;

      // Terminate worker
      await worker.terminate();
    } catch (err: unknown) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);

      // Ensure worker is terminated even if there's an error
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          if (isDevelopment) {
            console.error("Error terminating worker:", terminateError);
          }
        }
      }
    }

    const processingTime = Date.now() - startTime;

    // Get the S3 URL for the image
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: imageFile.key || imageFile.originalname,
    });
    const imageUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return this.ocrResultRepository.create({
      userId: new Types.ObjectId(userId),
      originalImage: imageFile.key || imageFile.originalname,
      imageUrl,
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
        if (isDevelopment) {
          console.error("Error deleting file from S3:", error);
        }
      }

      await this.ocrResultRepository.delete(id);
    }
  }
}

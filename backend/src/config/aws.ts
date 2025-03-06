import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

export const S3_BUCKET_NAME =
  process.env.S3_BUCKET_NAME || "your-s3-bucket-name";

// Configure AWS SDK v3
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "your-aws-region",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "YOUR_AWS_ACCESS_KEY_ID",
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY || "YOUR_AWS_SECRET_ACCESS_KEY",
  },
});

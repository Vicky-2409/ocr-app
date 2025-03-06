import {
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "../config/aws";
import corsConfig from "../config/s3-cors.json";
import bucketPolicy from "../config/s3-policy.json";

async function setupS3Bucket() {
  try {
    // Apply CORS configuration
    const corsCommand = new PutBucketCorsCommand({
      Bucket: S3_BUCKET_NAME,
      CORSConfiguration: corsConfig,
    });
    await s3Client.send(corsCommand);
    console.log("CORS configuration applied successfully");

    // Apply bucket policy
    const policyCommand = new PutBucketPolicyCommand({
      Bucket: S3_BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy),
    });
    await s3Client.send(policyCommand);
    console.log("Bucket policy applied successfully");

    console.log("S3 bucket setup completed successfully");
  } catch (error) {
    console.error("Error setting up S3 bucket:", error);
    process.exit(1);
  }
}

setupS3Bucket();

declare module "multer-s3" {
  import { S3Client } from "@aws-sdk/client-s3";
  import { Request } from "express";
  import { FileFilterCallback } from "multer";

  interface S3StorageOptions {
    s3: S3Client;
    bucket: string;
    key?: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, key?: string) => void
    ) => void;
    acl?: string;
    contentType?: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, contentType?: string) => void
    ) => void;
    contentDisposition?: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, contentDisposition?: string) => void
    ) => void;
    metadata?: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, metadata?: any) => void
    ) => void;
    serverSideEncryption?: string;
  }

  function multerS3(options: S3StorageOptions): any;

  export = multerS3;
}

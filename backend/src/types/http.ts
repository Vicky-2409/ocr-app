import { Request } from "express";
import { Express } from "express";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  file?: Express.Multer.File;
  params: {
    [key: string]: string;
  };
  headers: {
    [key: string]: string | undefined;
  };
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse {
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
  };
}

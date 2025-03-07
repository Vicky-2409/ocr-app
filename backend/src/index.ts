import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { router } from "./routes";
import { HttpStatus } from "./types/http";
import { Messages } from "./constants/messages";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV !== "production";

// Increase server timeout and body size limits
app.use((req, res, next) => {
  res.setTimeout(600000); // 10 minutes
  next();
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Add response headers middleware
app.use((req, res, next) => {
  // Set CORS headers explicitly for each request
  res.header(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGIN || "http://localhost:3000"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.header("Access-Control-Max-Age", "86400");

  // Log request details
  console.log("Request Debug:", {
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
    url: req.url,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? "Present" : "Missing",
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
    },
    body: req.method === "POST" ? "Present" : "N/A",
  });

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return res.status(200).end();
  }

  next();
});

// Parse JSON and URL-encoded bodies after CORS
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Log environment variables (excluding sensitive data)
console.log("Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? "Present" : "Missing",
  JWT_SECRET: process.env.JWT_SECRET ? "Present" : "Missing",
  AWS_REGION: process.env.AWS_REGION ? "Present" : "Missing",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ? "Present" : "Missing",
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Root route handler
app.get("/", (req, res) => {
  res.status(200).json({
    name: "OCR App API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      auth: {
        base: "/api/auth",
        routes: {
          login: "POST /api/auth/login",
          register: "POST /api/auth/register",
          logout: "POST /api/auth/logout",
        },
      },
      ocr: {
        base: "/api/ocr",
        routes: {
          process: "POST /api/ocr/process",
          results: "GET /api/ocr/results",
          resultById: "GET /api/ocr/results/:id",
          deleteResult: "DELETE /api/ocr/results/:id",
        },
      },
    },
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api", router);

// 404 handler for undefined routes
app.use((req, res) => {
  console.log("404 Error:", {
    method: req.method,
    path: req.path,
    url: req.url,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? "Present" : "Missing",
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
    },
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: {
      auth: "/api/auth/*",
      ocr: "/api/ocr/*",
      health: "/api/health",
      docs: "/",
    },
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: err.message || "Internal Server Error",
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ocr-app")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

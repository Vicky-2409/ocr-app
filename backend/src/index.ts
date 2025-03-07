import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import authRoutes from "./routes/auth";
import ocrRoutes from "./routes/ocr";
import { HttpStatus } from "./types/http";
import { Messages } from "./constants/messages";

const app = express();
const PORT = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV !== "production";

// Increase server timeout and body size limits
app.use((req, res, next) => {
  res.setTimeout(600000); // 10 minutes
  next();
});

// CORS configuration
const corsOptions = {
  origin: "https://ocr-app-frontend.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Credentials",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

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
app.use("/api/auth", authRoutes);
app.use("/api/ocr", ocrRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  console.log("404 Error:", {
    method: req.method,
    path: req.path,
    headers: req.headers,
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
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.GENERAL.SERVER_ERROR,
    });
  }
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ocr-app")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

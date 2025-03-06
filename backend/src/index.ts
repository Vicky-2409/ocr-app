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

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(HttpStatus.OK).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ocr", ocrRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from frontend build directory
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));

  // Handle React routing, return all requests to React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });
}

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (isDevelopment) {
      console.error(err.stack);
    }
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
    if (isDevelopment) {
      console.log("Connected to MongoDB");
    }
    app.listen(PORT, () => {
      if (isDevelopment) {
        console.log(`Server is running on port ${PORT}`);
      }
    });
  })
  .catch((error) => {
    if (isDevelopment) {
      console.error("MongoDB connection error:", error);
    }
    process.exit(1);
  });

import { Schema, model, Document, Model, Types } from "mongoose";

export interface IOcrResult extends Document {
  userId: Types.ObjectId;
  originalImage: string;
  extractedText: string;
  processingTime: number;
  status: "success" | "failed";
  error?: string;
}

export interface IOcrResultModel extends Model<IOcrResult> {
  findByUserId(userId: Types.ObjectId): Promise<IOcrResult[]>;
}

const ocrResultSchema = new Schema<IOcrResult, IOcrResultModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalImage: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    processingTime: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
ocrResultSchema.index({ userId: 1, createdAt: -1 });

// Static method implementation
ocrResultSchema.static(
  "findByUserId",
  function (userId: Types.ObjectId): Promise<IOcrResult[]> {
    console.log("Finding results for user ID:", userId);
    return this.find({ userId })
      .sort({ createdAt: -1 })
      .then((results) => {
        console.log("Found results:", results);
        return results;
      });
  }
);

export const OcrResult = model<IOcrResult, IOcrResultModel>(
  "OcrResult",
  ocrResultSchema
);

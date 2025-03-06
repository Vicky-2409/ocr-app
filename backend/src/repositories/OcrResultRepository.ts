import { Types } from "mongoose";
import { IOcrResult, IOcrResultModel, OcrResult } from "../models/OcrResult";
import { BaseRepository } from "./BaseRepository";

export interface IOcrResultRepository extends BaseRepository<IOcrResult> {
  findByUserId(userId: Types.ObjectId): Promise<IOcrResult[]>;
}

export class OcrResultRepository
  extends BaseRepository<IOcrResult>
  implements IOcrResultRepository
{
  constructor() {
    super(OcrResult);
  }

  async findByUserId(userId: Types.ObjectId): Promise<IOcrResult[]> {
    console.log("Repository: Finding results for user ID:", userId);
    const results = await (this.model as IOcrResultModel)
      .find({ userId })
      .sort({ createdAt: -1 });
    console.log("Repository: Found results:", results);
    return results;
  }
}

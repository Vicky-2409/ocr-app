import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

export interface AuthenticatedRequest
  extends Request<ParamsDictionary, any, any, ParsedQs> {
  user: {
    id: string;
    email: string;
  };
  file?: Express.Multer.File;
}

import "express";
import type { File } from "multer";

declare global {
  namespace Express {
    interface Request {
      file?: File;
      files?: File[] | { [fieldname: string]: File[] };
    }
  }
}
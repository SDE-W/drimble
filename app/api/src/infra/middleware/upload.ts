import multer from "multer";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { WORKSPACES_DIR } from "../../shared/constants";

const UPLOAD_DIR = path.join(WORKSPACES_DIR, "uploads");

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-tar",
  "application/gzip",
];

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

/*
  TODO
  S3 swap later:
  import multerS3 from "multer-s3";
  import { S3Client } from "@aws-sdk/client-s3";

  const s3 = new S3Client({ region: process.env.AWS_REGION });

  const storage = multerS3({
    s3,
    bucket: process.env.S3_BUCKET!,
    key: (_req, file, cb) => cb(null, `uploads/${randomUUID()}${path.extname(file.originalname)}`),
  });
*/
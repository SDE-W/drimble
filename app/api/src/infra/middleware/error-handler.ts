import { Request, Response, NextFunction } from "express";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

interface AppErrorLike {
  statusCode?: number;
  message: string;
  stack?: string;
}

function isPostgresError(err: unknown): err is { code: string; detail: string } {
  return typeof err === "object" && err !== null && "code" in err;
}

export function errorHandler(
  err: AppErrorLike,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as unknown as { requestId: string }).requestId;

  // Postgres unique violation
  if (isPostgresError(err) && err.code === "23505") {
    logger.warn("unique_constraint_violation", {
      event: "unique_constraint_violation",
      service: SERVICE_NAME,
      requestId,
      detail: err.detail,
    });
    res.status(409).json({
      error: "A resource with this name already exists",
      detail: err.detail,
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 500) {
    logger.error("unhandled_error", {
      event: "unhandled_error",
      service: SERVICE_NAME,
      requestId,
      message: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    error: err.message ?? "Internal server error",
  });
}
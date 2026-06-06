import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import type { AuthenticatedRequest } from "../../shared/types";

export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  (req as AuthenticatedRequest).requestId =
    (req.headers["x-request-id"] as string) ?? randomUUID();
  next();
}
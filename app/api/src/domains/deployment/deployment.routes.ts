import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  createDeploymentHandler,
  listDeploymentsHandler,
  getDeploymentHandler,
  streamLogsHandler,
} from "./deployment.controller";
import { validateRequest } from "../../infra/middleware/validate.middleware";
import { uploadMiddleware } from "../../infra/middleware/upload";
import { createDeploymentSchema } from "./deployment.validator";

const router = Router();

// POST /api/v1/deployments
router.post(
  "/",
  uploadMiddleware.single("file"),
  validateRequest({
    body: createDeploymentSchema,
    file: {
      required: false,
      mimeTypes: [
        "application/zip",
        "application/x-zip-compressed",
        "application/x-tar",
        "application/gzip",
      ],
      maxSizeBytes: 100 * 1024 * 1024,
    },
  }),
  (req: Request, res: Response, next: NextFunction) =>
    void createDeploymentHandler(req, res, next),
);

// GET /api/v1/deployments
router.get(
  "/",
  (req: Request, res: Response, next: NextFunction) =>
    void listDeploymentsHandler(req, res, next),
);

// GET /api/v1/deployments/:id
router.get(
  "/:id",
  (req: Request, res: Response, next: NextFunction) =>
    void getDeploymentHandler(req, res, next),
);

// GET /api/v1/deployments/:id/logs  (SSE)
router.get(
  "/:id/logs",
  (req: Request, res: Response, next: NextFunction) =>
    void streamLogsHandler(req, res, next),
);

export default router;

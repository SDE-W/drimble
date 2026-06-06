import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  getDeploymentLogsHandler,
  getDeploymentLogCountHandler,
} from "./deployment-log.controller";
import { validateRequest } from "../../infra/middleware/validate.middleware";
import {
  getDeploymentLogsSchema,
  getDeploymentLogCountSchema,
} from "./deployment-log.validator";

const router = Router();

// GET /api/deployment-logs?deploymentId=xxx&phase=build&page=1&limit=50
router.get(
  "/",
  validateRequest({ query: getDeploymentLogsSchema }),
  (req: Request, res: Response, next: NextFunction) =>
    void getDeploymentLogsHandler(req, res, next),
);

// GET /api/deployment-logs/count?deploymentId=xxx
router.get(
  "/count",
  validateRequest({ query: getDeploymentLogCountSchema }),
  (req: Request, res: Response, next: NextFunction) =>
    void getDeploymentLogCountHandler(req, res, next),
);

export default router;

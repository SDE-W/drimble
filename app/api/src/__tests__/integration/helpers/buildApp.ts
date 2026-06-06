import express from "express";
import helmet from "helmet";
import cors from "cors";
import { requestIdMiddleware } from "../../../infra/middleware/requestid.middleware";
import { errorHandler } from "../../../infra/middleware/error-handler";
import deploymentRoutes from "../../../domains/deployment/deployment.routes";
import deadLetterRoutes from "../../../domains/dead-letter/dead-letter.routes";
import deploymentLogRoutes from "../../../domains/deployment-log/deployment-log.routes";

export default function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/v1/deployments", deploymentRoutes);
  app.use("/api/v1/dead-letters", deadLetterRoutes);
  app.use("/api/v1/deployment-logs", deploymentLogRoutes);

  app.use(errorHandler);

  return app;
}

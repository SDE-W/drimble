import winston, { format, type Logger } from "winston";
import { NODE_ENV } from "../constants";

export function createLogger(serviceName: string): Logger {
  const logger = winston.createLogger({
    level: NODE_ENV === "production" ? "info" : "debug",
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [new winston.transports.Console()],
  });

  if (NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        ),
      })
    );
  }

  return logger;
}

export default createLogger("brimble-api");
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  listDeadLettersHandler,
  getDeadLetterHandler,
  resolveDeadLetterHandler,
} from "./dead-letter.controller";
import { validateRequest } from "../../infra/middleware/validate.middleware";
import {
  listDeadLettersSchema,
  resolveDeadLetterSchema,
} from "./dead-letter.validator";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listDeadLettersSchema }),
  (req: Request, res: Response, next: NextFunction) =>
    void listDeadLettersHandler(req, res, next)
);

router.get(
  "/:jobId",
  (req: Request, res: Response, next: NextFunction) =>
    void getDeadLetterHandler(req, res, next)
);

router.patch(
  "/:jobId/resolve",
  validateRequest({ body: resolveDeadLetterSchema }),
  (req: Request, res: Response, next: NextFunction) =>
    void resolveDeadLetterHandler(req, res, next)
);

export default router;
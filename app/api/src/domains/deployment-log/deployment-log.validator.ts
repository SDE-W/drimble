import Joi from "joi";

export const getDeploymentLogsSchema = Joi.object({
  deploymentId: Joi.string().uuid().required().messages({
    "string.uuid": "deploymentId must be a valid UUID",
    "any.required": "deploymentId is required",
  }),
  phase: Joi.string()
    .valid("clone", "build", "run", "register", "system")
    .optional()
    .messages({
      "any.only":
        "phase must be one of: clone, build, run, register, system",
    }),
  page: Joi.number().integer().min(1).default(1).optional().messages({
    "number.min": "page must be at least 1",
    "number.integer": "page must be an integer",
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .optional()
    .messages({
      "number.min": "limit must be at least 1",
      "number.max": "limit cannot exceed 100",
      "number.integer": "limit must be an integer",
    }),
});

export const getDeploymentLogCountSchema = Joi.object({
  deploymentId: Joi.string().uuid().required().messages({
    "string.uuid": "deploymentId must be a valid UUID",
    "any.required": "deploymentId is required",
  }),
});
import Joi from "joi";

export const listDeadLettersSchema = Joi.object({
  tenantId: Joi.string().optional(),
  jobType: Joi.string()
    .valid(
      "DEPLOYMENT",
      "RESERVATION_EXPIRY",
      "PAYOUT_BATCH",
      "ORDER_ABANDONMENT",
      "LOW_STOCK_ALERT",
      "SCHEDULED_REPORT"
    )
    .optional()
    .messages({ "any.only": "Invalid jobType" }),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

export const resolveDeadLetterSchema = Joi.object({
  resolution: Joi.string().min(3).max(500).required().messages({
    "string.min": "Resolution must be at least 3 characters",
    "string.max": "Resolution cannot exceed 500 characters",
    "any.required": "Resolution is required",
  }),
});
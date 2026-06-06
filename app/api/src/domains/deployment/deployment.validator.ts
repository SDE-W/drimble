import Joi from "joi";

export const createDeploymentSchema = Joi.object({
  sourceType: Joi.string()
    .valid("git", "upload")
    .required()
    .messages({
      "any.only": "sourceType must be one of: git, upload",
      "any.required": "sourceType is required",
    }),
  sourceRef: Joi.when("sourceType", {
    is: "git",
    then: Joi.string().uri().required().messages({
      "string.uri": "sourceRef must be a valid URL for git source",
      "any.required": "sourceRef is required for git source",
    }),
    otherwise: Joi.string().optional(),
  }),
  name: Joi.string().max(100).optional().messages({
    "string.max": "name must be at most 100 characters",
  }),
});
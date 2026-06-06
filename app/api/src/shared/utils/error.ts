export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404,
      "NOT_FOUND",
      { resource, id }
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", context);
  }
}

export class PipelineError extends AppError {
  constructor(
    message: string,
    public readonly deploymentId: string,
    public readonly phase: string,
    context?: Record<string, unknown>
  ) {
    super(message, 500, "PIPELINE_ERROR", {
      deploymentId,
      phase,
      ...context,
    });
  }
}

export class MessagingError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 503, "MESSAGING_ERROR", context);
  }
}

export class DockerError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, "DOCKER_ERROR", context);
  }
}

export class CaddyError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, "CADDY_ERROR", context);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
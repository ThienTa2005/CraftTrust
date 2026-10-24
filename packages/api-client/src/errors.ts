import { z } from "zod";

export type CraftTrustErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAVAILABLE"
  | "BACKEND_ERROR"
  | "UNKNOWN_ERROR";

export class CraftTrustError extends Error {
  readonly code: CraftTrustErrorCode;
  readonly status: number | undefined;
  readonly details: unknown;

  constructor(
    code: CraftTrustErrorCode,
    message: string,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "CraftTrustError";
    this.code = code;
    this.status = options.status;
    this.details = options.details;
  }
}

const codeByStatus: Partial<Record<number, CraftTrustErrorCode>> = {
  400: "VALIDATION_ERROR",
  401: "AUTH_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "UNAVAILABLE",
  502: "UNAVAILABLE",
  503: "UNAVAILABLE",
};

export function normalizeCraftTrustError(
  error: unknown,
  fallback = "The request could not be completed",
): CraftTrustError {
  if (error instanceof CraftTrustError) return error;
  if (error instanceof z.ZodError) {
    return new CraftTrustError("VALIDATION_ERROR", "The request is invalid", {
      status: 400,
      details: error.flatten(),
      cause: error,
    });
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      status?: unknown;
      code?: unknown;
      details?: unknown;
    };
    const status =
      typeof candidate.status === "number" ? candidate.status : undefined;
    const postgresCode =
      typeof candidate.code === "string" ? candidate.code : "";
    const code =
      (status === undefined ? undefined : codeByStatus[status]) ??
      (postgresCode === "42501" ? "FORBIDDEN" : undefined) ??
      (postgresCode === "23505" ? "CONFLICT" : undefined) ??
      (postgresCode === "PGRST116" ? "NOT_FOUND" : undefined) ??
      "BACKEND_ERROR";
    const message =
      typeof candidate.message === "string" && candidate.message.length > 0
        ? candidate.message
        : fallback;
    return new CraftTrustError(code, message, {
      ...(status === undefined ? {} : { status }),
      details: candidate.details,
      cause: error,
    });
  }
  return new CraftTrustError("UNKNOWN_ERROR", fallback, { cause: error });
}

export function assertPresent<T>(
  value: T | null | undefined,
  message: string,
): T {
  if (value == null)
    throw new CraftTrustError("NOT_FOUND", message, { status: 404 });
  return value;
}

/**
 * Typed API response contracts matching the backend error handler.
 *
 * These types mirror the response shapes from:
 * - backend/src/middlewares/errorHandler.middleware.ts
 * - backend/src/utils/app-error.ts
 */

export type ErrorCodeType =
  | "ERR_INTERNAL"
  | "ERR_BAD_REQUEST"
  | "ERR_UNAUTHORIZED"
  | "ERR_FORBIDDEN"
  | "ERR_NOT_FOUND";

/** Validation error detail (Zod) */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * The unified error response shape returned by the backend.
 *
 * AppError:        { message, errorCode }
 * ZodError:        { message, errors, errorCode }
 * Internal Error:  { message, error, errorCode }
 */
export interface ApiErrorResponse {
  message: string;
  errorCode?: ErrorCodeType;
  errors?: ValidationErrorDetail[];
  error?: string;
}

/** Generic success response */
export interface ApiSuccessResponse<T = unknown> {
  message: string;
  data?: T;
}

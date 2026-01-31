import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Application Error Codes
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * API Error Response Structure
 */
export interface ApiError {
  success: false;
  error: {
    code: ErrorCodeType;
    message: string;
    details?: unknown;
  };
}

/**
 * API Success Response Structure
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Custom Application Error
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: ErrorCodeType,
  message: string,
  statusCode: number = 500,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T, statusCode: number = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
    },
    { status: statusCode }
  );
}

/**
 * Handle errors in API routes
 * Converts various error types to standardized API responses
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      400,
      error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
    );
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.statusCode, error.details);
  }

  // Handle generic errors
  if (error instanceof Error) {
    console.error('[API Error]', error.message, error.stack);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', 500);
  }

  // Handle unknown errors
  console.error('[API Error] Unknown error type:', error);
  return errorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', 500);
}

/**
 * Shorthand error creators
 */
export const Errors = {
  notFound: (resource: string = 'Resource') =>
    new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  unauthorized: (message: string = 'Authentication required') =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message: string = 'Access denied') =>
    new AppError(ErrorCode.FORBIDDEN, message, 403),

  badRequest: (message: string, details?: unknown) =>
    new AppError(ErrorCode.BAD_REQUEST, message, 400, details),

  conflict: (message: string) => new AppError(ErrorCode.CONFLICT, message, 409),

  internal: (message: string = 'Internal server error') =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500),
};


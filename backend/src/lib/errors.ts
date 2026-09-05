import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, type ErrorCode } from "./error-codes";
import { logError, type RequestInfo } from "./logger";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export class ProviderError extends ApiError {
  provider: string;
  operation: string;

  constructor(message: string, provider: string, operation: string, code: ErrorCode | string = "PROVIDER_ERROR", status?: number) {
    super(status ?? ERROR_CODES[code as ErrorCode] ?? 502, message, code);
    this.name = "ProviderError";
    this.provider = provider;
    this.operation = operation;
  }
}

function requestContext(req: Request): RequestInfo {
  const info: RequestInfo = {};
  const r = req as Request & { id?: string };
  if (typeof r.id === "string") info.id = r.id;
  info.method = req.method;
  info.path = req.originalUrl;
  return info;
}

export function jsonError(res: Response, status: number, message: string, code = "API_ERROR") {
  return res.status(status).json({ error: message, code });
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  code: string = "API_ERROR",
  data?: unknown
) {
  return res.status(status).json({ success: false, message, code, data: data ?? null });
}

export function sendSuccess<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({ success: true, data, message });
}

type AsyncHandlerFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandlerFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response) {
  return sendError(res, 404, "Not found", "NOT_FOUND");
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const ctx = requestContext(req);
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      logError("api_error", { ...ctx, code: err.code, message: err.message });
    }
    return sendError(res, err.status, err.message, err.code);
  }
  if (err instanceof Error) {
    logError("unhandled_error", { ...ctx, message: err.message, stack: err.stack });
  } else {
    logError("unhandled_error", { ...ctx, unknown: err });
  }
  return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
}

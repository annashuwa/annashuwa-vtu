import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { ApiError } from "../lib/errors";

export function validate(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      return next(new ApiError(400, first?.message ?? "Invalid input", "VALIDATION_ERROR"));
    }
    req.body = result.data;
    return next();
  };
}

export function parseQueryInt(value: unknown, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
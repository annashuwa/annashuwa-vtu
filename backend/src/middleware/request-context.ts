import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { requestLogger } from "../lib/logger";

const HEADER = "x-request-id";

export function requestIdAndLogging(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get(HEADER);
  const id = incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  (req as Request & { id?: string }).id = id;
  res.setHeader(HEADER, id);
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    requestLogger(req, res.statusCode, durationMs);
  });
  next();
}

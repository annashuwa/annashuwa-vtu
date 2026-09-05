import type { Request } from "express";

type Level = "debug" | "info" | "warn" | "error";

function ts(): string {
  return new Date().toISOString();
}

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line: Record<string, unknown> = {
    time: ts(),
    level,
    msg,
  };
  if (meta && Object.keys(meta).length > 0) {
    for (const [k, v] of Object.entries(meta)) {
      if (v !== undefined) line[k] = v;
    }
  }
  const text = JSON.stringify(line);
  if (level === "error") {
    process.stderr.write(text + "\n");
  } else {
    process.stdout.write(text + "\n");
  }
}

export interface RequestInfo {
  id?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
}

export function logInfo(msg: string, meta?: Record<string, unknown>) {
  emit("info", msg, meta);
}

export function logWarn(msg: string, meta?: Record<string, unknown>) {
  emit("warn", msg, meta);
}

export function logError(msg: string, meta?: Record<string, unknown>) {
  emit("error", msg, meta);
}

export function logDebug(msg: string, meta?: Record<string, unknown>) {
  if ((process.env.LOG_LEVEL ?? "info") === "debug") {
    emit("debug", msg, meta);
  }
}

export function requestLogger(req: Request, status?: number, durationMs?: number) {
  const meta: RequestInfo = {};
  if (typeof (req as Request & { id?: string }).id === "string") {
    meta.id = (req as Request & { id?: string }).id;
  }
  meta.method = req.method;
  meta.path = req.originalUrl;
  if (status !== undefined) meta.status = status;
  if (durationMs !== undefined) meta.durationMs = Math.round(durationMs);
  const authUser = (req as Request & { authUser?: { _id?: unknown } }).authUser;
  if (authUser && authUser._id) meta.userId = String(authUser._id);
  emit("info", "request", { ...meta });
}

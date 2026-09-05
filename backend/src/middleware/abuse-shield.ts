import type { NextFunction, Request, Response } from "express";

const MAX_HEADER_COUNT = 80;
const MAX_QUERY_LENGTH = 2048;
const MAX_URL_LENGTH = 8192;

/**
 * Global abuse-protection shield. Runs before route handlers for every request.
 * - Caps the number of HTTP headers (header-bomb mitigation).
 * - Caps the query string and full URL length (deep-URL / oversized-query abuse).
 * Rejects with structured error envelopes matching the rest of the API.
 */
export function abuseShield(req: Request, res: Response, next: NextFunction) {
  const headerCount = Object.keys(req.headers).length;
  if (headerCount > MAX_HEADER_COUNT) {
    return res.status(431).json({ error: "Too many headers", code: "API_ERROR" });
  }

  const queryLength = req.originalUrl.includes("?")
    ? req.originalUrl.length - req.originalUrl.indexOf("?") - 1
    : 0;
  if (queryLength > MAX_QUERY_LENGTH) {
    return res.status(414).json({ error: "Request URL is too long", code: "API_ERROR" });
  }
  if (req.originalUrl.length > MAX_URL_LENGTH) {
    return res.status(414).json({ error: "Request URL is too long", code: "API_ERROR" });
  }

  return next();
}

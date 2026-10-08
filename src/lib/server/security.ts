import { NextResponse } from "next/server";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

// In-memory sliding window rate limiter
type RateLimitRecord = {
  timestamps: number[];
};

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale records every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

const cleanupStaleRecords = (windowMs: number) => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    const validTimestamps = record.timestamps.filter((time) => now - time < windowMs);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  }
};

/**
 * Standard in-memory sliding window rate limiter.
 * @param identifier Client IP or unique user identifier
 * @param limit Maximum allowed requests per window
 * @param windowMs Time window in milliseconds
 */
export const checkRateLimit = (
  identifier: string,
  limit = 30,
  windowMs = 60 * 1000
): RateLimitResult => {
  cleanupStaleRecords(windowMs);

  const now = Date.now();
  const record = rateLimitStore.get(identifier) ?? { timestamps: [] };

  // Keep only timestamps within the current window
  const validTimestamps = record.timestamps.filter((time) => now - time < windowMs);
  record.timestamps = validTimestamps;

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0] ?? now;
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    rateLimitStore.set(identifier, record);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(identifier, record);

  const resetSeconds = Math.ceil(windowMs / 1000);
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - validTimestamps.length),
    resetSeconds
  };
};

/**
 * Extract client IP securely from standard proxy headers.
 */
export const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
};

/**
 * Standard Security Headers applied to all API responses.
 */
export const standardSecurityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

/**
 * Sanitize string: strips null bytes, control characters, truncates length, and normalizes space.
 */
export const sanitizeString = (value: unknown, maxLength = 2000): string => {
  if (typeof value !== "string") return "";
  return value
    // Remove null bytes and non-printable control characters (except newline \n and carriage return \r)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
};

export type ApiErrorDetails = {
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Build a standardized JSON error response.
 */
export const apiErrorResponse = (
  code: string,
  message: string,
  status: number,
  details?: unknown,
  extraHeaders?: Record<string, string>
) => {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    {
      status,
      headers: {
        ...standardSecurityHeaders,
        ...(extraHeaders ?? {})
      }
    }
  );
};

/**
 * Build a standardized JSON success response.
 */
export const apiSuccessResponse = <T>(
  data: T,
  status = 200,
  extraHeaders?: Record<string, string>
) => {
  return NextResponse.json(
    {
      success: true,
      data
    },
    {
      status,
      headers: {
        ...standardSecurityHeaders,
        ...(extraHeaders ?? {})
      }
    }
  );
};

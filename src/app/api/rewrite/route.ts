import {
  apiErrorResponse,
  apiSuccessResponse,
  checkRateLimit,
  getClientIp
} from "@/lib/server/security";
import { validateRewriteRequest } from "@/lib/server/validation";
import { rewriteBulletPoint } from "@/lib/server/ai-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Rate Limit (40 req / minute per client IP)
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`rewrite:${clientIp}`, 40, 60 * 1000);

  const rateLimitHeaders: Record<string, string> = {
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.resetSeconds.toString()
  };

  if (!rateLimit.allowed) {
    return apiErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      `Terlalu banyak permintaan perbaikan kalimat. Silakan tunggu ${rateLimit.resetSeconds} detik.`,
      429,
      undefined,
      {
        ...rateLimitHeaders,
        "Retry-After": rateLimit.resetSeconds.toString()
      }
    );
  }

  // 2. Safe JSON Parsing
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(
      "INVALID_JSON",
      "Format permintaan harus berupa JSON yang valid.",
      400,
      undefined,
      rateLimitHeaders
    );
  }

  // 3. Strict Input Validation & Sanitization
  const validation = validateRewriteRequest(body);
  if (!validation.success) {
    return apiErrorResponse(
      "VALIDATION_ERROR",
      "Data masukan tidak memenuhi standar validasi.",
      400,
      validation.errors,
      rateLimitHeaders
    );
  }

  // 4. Execution
  try {
    const result = await rewriteBulletPoint(
      validation.data.bullet,
      validation.data.role,
      validation.data.jobTitle,
      validation.data.targetKeywords
    );
    return apiSuccessResponse(result, 200, rateLimitHeaders);
  } catch (error) {
    console.error("[API_REWRITE_ERROR]", error);
    return apiErrorResponse(
      "PROCESSING_ERROR",
      "Gagal memproses perbaikan kalimat. Silakan coba kembali.",
      500,
      undefined,
      rateLimitHeaders
    );
  }
}

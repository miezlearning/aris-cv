import {
  apiErrorResponse,
  apiSuccessResponse,
  checkRateLimit,
  getClientIp
} from "@/lib/server/security";
import { validateAnalyzeRequest } from "@/lib/server/validation";
import { runJobAnalysis } from "@/lib/server/ai-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Check Rate Limit (30 req / minute per client IP)
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`analyze:${clientIp}`, 30, 60 * 1000);

  const rateLimitHeaders: Record<string, string> = {
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.resetSeconds.toString()
  };

  if (!rateLimit.allowed) {
    return apiErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      `Terlalu banyak permintaan analisis. Silakan coba lagi dalam ${rateLimit.resetSeconds} detik.`,
      429,
      undefined,
      {
        ...rateLimitHeaders,
        "Retry-After": rateLimit.resetSeconds.toString()
      }
    );
  }

  // 2. Safe JSON Parsing & Payload Size Guard
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
  const validation = validateAnalyzeRequest(body);
  if (!validation.success) {
    return apiErrorResponse(
      "VALIDATION_ERROR",
      "Data masukan tidak memenuhi standar validasi.",
      400,
      validation.errors,
      rateLimitHeaders
    );
  }

  // 4. Execution with safe fallback
  try {
    const result = await runJobAnalysis(validation.data.resume, validation.data.job);
    return apiSuccessResponse(result, 200, rateLimitHeaders);
  } catch (error) {
    console.error("[API_ANALYZE_ERROR]", error);
    return apiErrorResponse(
      "PROCESSING_ERROR",
      "Terjadi kendala saat memproses analisis lowongan. Silakan coba kembali.",
      500,
      undefined,
      rateLimitHeaders
    );
  }
}

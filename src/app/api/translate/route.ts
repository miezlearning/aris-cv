import { apiErrorResponse, apiSuccessResponse, checkRateLimit, getClientIp } from "@/lib/server/security";
import { validateAnalyzeRequest } from "@/lib/server/validation";
import { translateResumeWithAi } from "@/lib/server/ai-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`translate:${clientIp}`, 25, 60 * 1000);

  const rateLimitHeaders: Record<string, string> = {
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.resetSeconds.toString()
  };

  if (!rateLimit.allowed) {
    return apiErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      `Terlalu banyak permintaan terjemahan. Silakan tunggu ${rateLimit.resetSeconds} detik.`,
      429,
      undefined,
      {
        ...rateLimitHeaders,
        "Retry-After": rateLimit.resetSeconds.toString()
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("INVALID_JSON", "Format permintaan harus berupa JSON valid.", 400, undefined, rateLimitHeaders);
  }

  const rawPayload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const targetLang: "id" | "en" = rawPayload.targetLang === "id" ? "id" : "en";
  const validation = validateAnalyzeRequest({
    resume: rawPayload.resume,
    job: { rawDescription: `translate resume to ${targetLang === "en" ? "English" : "Indonesian"} ATS`, jobTitle: "", companyName: "" }
  });

  if (!validation.success) {
    return apiErrorResponse(
      "VALIDATION_ERROR",
      "Data profil CV tidak valid untuk diterjemahkan.",
      400,
      validation.errors,
      rateLimitHeaders
    );
  }

  try {
    const result = await translateResumeWithAi(validation.data.resume, targetLang);
    return apiSuccessResponse(result, 200, rateLimitHeaders);
  } catch (error) {
    console.error("[API_TRANSLATE_ERROR]", error);
    return apiErrorResponse(
      "PROCESSING_ERROR",
      "Gagal memproses terjemahan CV. Silakan coba kembali.",
      500,
      undefined,
      rateLimitHeaders
    );
  }
}

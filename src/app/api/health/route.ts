import { apiSuccessResponse } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasPaymentSecret = Boolean(process.env.PAYMENT_GATEWAY_SECRET?.trim());

  return apiSuccessResponse({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    engine: {
      aiConfigured: hasGemini || hasOpenRouter,
      aiProvider: hasGemini ? "gemini" : hasOpenRouter ? "openrouter" : "deterministic-fallback",
      paymentGatewayConfigured: hasPaymentSecret
    }
  });
}

import dns from "node:dns/promises";
import net from "node:net";
import {
  apiErrorResponse,
  apiSuccessResponse,
  checkRateLimit,
  getClientIp,
  sanitizeString
} from "@/lib/server/security";

export const dynamic = "force-dynamic";

const MAX_PROXY_URL_LENGTH = 4096;
const MAX_RESPONSE_BYTES = 262144;

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // Link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a >= 224) return true; // Multicast & reserved
  return false;
};

const isDisallowedIpAddress = (address: string): boolean => {
  const clean = address.trim().toLowerCase();
  const zoneIndex = clean.indexOf("%");
  const normalized = zoneIndex >= 0 ? clean.slice(0, zoneIndex) : clean;

  const version = net.isIP(normalized);
  if (version === 4) {
    return isPrivateIpv4(normalized);
  }
  if (version === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("::ffff:")) {
      const mappedV4 = normalized.slice(7);
      if (net.isIP(mappedV4) === 4) return isPrivateIpv4(mappedV4);
    }
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
      return true; // Link-local fe80::/10
    }
    if (normalized.startsWith("ff")) return true; // Multicast
    return false;
  }
  return true;
};

const isBlockedHostname = (hostname: string): boolean => {
  const lower = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!lower) return true;
  if (net.isIP(lower) !== 0) return true;
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".lan") ||
    lower.endsWith(".home.arpa")
  ) {
    return true;
  }
  return !/\.[a-z]{2,}$/i.test(lower);
};

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`ai-proxy:${clientIp}`, 40, 60 * 1000);

  const rateLimitHeaders: Record<string, string> = {
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.resetSeconds.toString()
  };

  if (!rateLimit.allowed) {
    return apiErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      `Terlalu banyak permintaan proxy AI. Tunggu ${rateLimit.resetSeconds} detik.`,
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
    return apiErrorResponse("INVALID_JSON", "Permintaan proxy harus berupa JSON valid.", 400, undefined, rateLimitHeaders);
  }

  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const rawUrl = sanitizeString(payload.url, MAX_PROXY_URL_LENGTH);
  const apiKey = sanitizeString(payload.apiKey, 512);

  if (!rawUrl) {
    return apiErrorResponse("INVALID_URL", "URL tujuan wajib diisi.", 400, undefined, rateLimitHeaders);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return apiErrorResponse("INVALID_URL", "Format URL endpoint tidak valid.", 400, undefined, rateLimitHeaders);
  }

  if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
    return apiErrorResponse(
      "DISALLOWED_URL",
      "Proxy hanya mengizinkan endpoint HTTPS publik tanpa kredensial di URL.",
      400,
      undefined,
      rateLimitHeaders
    );
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return apiErrorResponse(
      "DISALLOWED_HOST",
      "Host tujuan tidak diizinkan untuk proxy.",
      400,
      undefined,
      rateLimitHeaders
    );
  }

  try {
    const records = await dns.lookup(parsedUrl.hostname, { all: true });
    if (!records.length || records.some((rec) => isDisallowedIpAddress(rec.address))) {
      return apiErrorResponse(
        "DISALLOWED_HOST",
        "Alamat IP tujuan termasuk jaringan lokal/privat yang tidak diizinkan.",
        400,
        undefined,
        rateLimitHeaders
      );
    }
  } catch {
    return apiErrorResponse(
      "DNS_LOOKUP_FAILED",
      "Nama domain endpoint REST API tidak dapat diresolusi.",
      502,
      undefined,
      rateLimitHeaders
    );
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain"
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const upstream = await fetch(parsedUrl.toString(), {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(25000)
    });

    const rawText = (await upstream.text()).slice(0, MAX_RESPONSE_BYTES);
    const contentType = upstream.headers.get("content-type") ?? "";

    return apiSuccessResponse(
      {
        status: upstream.status,
        ok: upstream.ok,
        contentType,
        body: rawText
      },
      200,
      rateLimitHeaders
    );
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    return apiErrorResponse(
      isTimeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR",
      isTimeout
        ? "Endpoint REST API tidak merespons dalam batas waktu."
        : "Gagal menghubungi endpoint REST API tujuan.",
      502,
      undefined,
      rateLimitHeaders
    );
  }
}

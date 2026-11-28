import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";
import type { LocalAiProvider, RestApiFormat } from "@/lib/local-ai/models";

export type LocalChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ActiveLocalAiConfig =
  | { mode: "webllm"; modelId: string }
  | { mode: "ollama" | "lmstudio"; baseUrl: string; modelId: string }
  | { mode: "rest_api"; format: RestApiFormat; baseUrl: string; modelId: string; apiKey: string };

export class WebLlmCancelledError extends Error {
  constructor(message = "Unduhan model dibatalkan.") {
    super(message);
    this.name = "WebLlmCancelledError";
  }
}

const SESSION_API_KEY_STORAGE = "quicktailor-rest-api-key";

let webLlmEngine: MLCEngineInterface | null = null;
let webLlmWorker: Worker | null = null;
let loadedWebLlmModelId = "";
let loadSequence = 0;
let cancelRejecter: ((reason: Error) => void) | null = null;

const cleanBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

export const readSessionApiKey = (): string => {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(SESSION_API_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
};

export const saveSessionApiKey = (apiKey: string): void => {
  if (typeof window === "undefined") return;
  try {
    if (apiKey.trim()) {
      window.sessionStorage.setItem(SESSION_API_KEY_STORAGE, apiKey.trim());
    } else {
      window.sessionStorage.removeItem(SESSION_API_KEY_STORAGE);
    }
  } catch {
    // Abaikan error sessionStorage pada mode private browser
  }
};

export const resolveActiveAiConfig = (state: {
  aiEnabled: boolean;
  localAiStatus: "idle" | "downloading" | "ready" | "error";
  localAiMode: LocalAiProvider;
  webLlmModelId: string;
  localServerUrl: string;
  localServerModel: string;
  restApiFormat: RestApiFormat;
  restApiUrl: string;
  restApiModel: string;
  restApiKey: string;
}): ActiveLocalAiConfig | null => {
  if (!state.aiEnabled || state.localAiStatus !== "ready") return null;

  if (state.localAiMode === "webllm") {
    return { mode: "webllm", modelId: state.webLlmModelId };
  }
  if (state.localAiMode === "ollama" || state.localAiMode === "lmstudio") {
    if (!state.localServerUrl.trim() || !state.localServerModel.trim()) return null;
    return {
      mode: state.localAiMode,
      baseUrl: state.localServerUrl,
      modelId: state.localServerModel
    };
  }
  if (state.localAiMode === "rest_api") {
    if (!state.restApiUrl.trim()) return null;
    const isGetQuery = state.restApiFormat === "get_query";
    if (!isGetQuery && !state.restApiModel.trim()) return null;
    return {
      mode: "rest_api",
      format: state.restApiFormat,
      baseUrl: state.restApiUrl,
      modelId: isGetQuery
        ? deriveGetQueryDisplayLabel(state.restApiUrl, state.restApiModel)
        : state.restApiModel,
      apiKey: state.restApiKey || readSessionApiKey()
    };
  }

  return null;
};

export const deriveGetQueryDisplayLabel = (baseUrl: string, modelId?: string): string => {
  const customLabel = (modelId ?? "").trim();
  if (customLabel) return customLabel;

  try {
    const parsed = new URL(baseUrl.trim());
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length > 0) return segments[segments.length - 1];
    if (parsed.hostname) return parsed.hostname;
  } catch {
    // Abaikan error parsing URL untuk label tampilan
  }

  return "GET API";
};

export const KNOWN_PROMPT_PARAMS = [
  "text",
  "q",
  "query",
  "message",
  "ask",
  "content",
  "input",
  "prompt"
] as const;

const detectedPromptParamCache = new Map<string, string>();

const getUrlCacheKey = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl.trim());
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
};

export const getDetectedPromptParam = (rawUrl: string): string | undefined =>
  detectedPromptParamCache.get(getUrlCacheKey(rawUrl));

export const detectMissingParamFromError = (rawError: string): string | null => {
  const clean = (rawError ?? "").trim();
  if (!clean) return null;

  for (const param of KNOWN_PROMPT_PARAMS) {
    const beforeKeyword = new RegExp(
      `(?:^|[\\s"'\\(\\{\\[:])(${param})(?:["'\\)\\]\\}])?\\s+(?:is\\s+)?(?:required|missing|empty|needed|wajib|dibutuhkan|harus\\s+diisi)\\b`,
      "i"
    );
    const afterKeyword = new RegExp(
      `(?:missing|required|need|provide|empty)\\s+(?:query\\s+|url\\s+)?(?:param(?:eter)?|field|arg)?\\s*[:=]?\\s*["'\`]?(${param})["'\`]?(?:\\b|$)`,
      "i"
    );
    if (beforeKeyword.test(clean) || afterKeyword.test(clean)) {
      return param;
    }
  }

  return null;
};

export const buildGetQueryUrl = (
  rawBaseUrl: string,
  messages: LocalChatMessage[],
  temperature: number,
  options?: { promptParam?: string }
): string => {
  const trimmedRaw = rawBaseUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmedRaw);
  } catch {
    throw new Error("Format URL endpoint GET tidak valid. Pastikan diawali https://.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL endpoint GET harus menggunakan protokol http:// atau https://.");
  }

  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join("\n");

  const nonSystem = messages.filter((m) => m.role !== "system");
  const promptText =
    nonSystem.length === 1
      ? nonSystem[0].content.trim()
      : nonSystem
          .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content.trim()}`)
          .join("\n");

  const combinedText = systemText ? `${systemText}\n\n${promptText}` : promptText;
  const tempStr = String(Number(temperature.toFixed(2)));

  if (/\{prompt\}|%7Bprompt%7D/i.test(trimmedRaw)) {
    const hasSystemPlaceholder = /\{system\}|%7Bsystem%7D/i.test(trimmedRaw);
    const primaryValue = hasSystemPlaceholder ? promptText : combinedText;
    return trimmedRaw
      .replace(/\{prompt\}|%7Bprompt%7D/gi, encodeURIComponent(primaryValue))
      .replace(/\{system\}|%7Bsystem%7D/gi, encodeURIComponent(systemText))
      .replace(/\{temperature\}|%7Btemperature%7D/gi, encodeURIComponent(tempStr));
  }

  let promptKey: string;
  let systemKey: string | null = null;
  const explicitOverride = options?.promptParam?.trim().toLowerCase();

  if (explicitOverride) {
    promptKey = explicitOverride;
    if (promptKey === "prompt") {
      systemKey = "system";
    }
  } else if (parsed.searchParams.has("text") && parsed.searchParams.has("prompt")) {
    promptKey = "text";
    systemKey = "prompt";
  } else if (parsed.searchParams.has("text") && parsed.searchParams.has("system")) {
    promptKey = "text";
    systemKey = "system";
  } else {
    const matchedParam = KNOWN_PROMPT_PARAMS.find((p) => parsed.searchParams.has(p));
    if (matchedParam) {
      promptKey = matchedParam;
      if (matchedParam === "prompt") {
        systemKey = "system";
      }
    } else {
      promptKey = "prompt";
      systemKey = "system";
    }
  }

  if (promptKey === "prompt") {
    parsed.searchParams.set("prompt", promptText);
    if (systemText) {
      parsed.searchParams.set("system", systemText);
    } else {
      parsed.searchParams.delete("system");
    }
    parsed.searchParams.set("temperature", tempStr);
  } else if (systemKey) {
    parsed.searchParams.set(promptKey, promptText);
    if (systemText) {
      parsed.searchParams.set(systemKey, systemText);
    } else {
      parsed.searchParams.delete(systemKey);
    }
    if (parsed.searchParams.has("temperature")) {
      parsed.searchParams.set("temperature", tempStr);
    }
  } else {
    if (explicitOverride) {
      parsed.searchParams.delete("prompt");
      parsed.searchParams.delete("system");
      parsed.searchParams.delete("temperature");
    }
    parsed.searchParams.set(promptKey, combinedText);
  }

  return parsed.toString();
};

const WRAPPER_TEXT_KEYS = [
  "data",
  "result",
  "response",
  "answer",
  "output",
  "reply",
  "content",
  "text",
  "message"
] as const;

export const extractFlexibleTextResponse = (payload: unknown, depth = 0): string => {
  if (depth > 4 || payload === null || payload === undefined) return "";
  if (typeof payload === "string") return payload.trim();
  if (typeof payload !== "object") return "";

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const firstChoice = obj.choices[0] as Record<string, unknown> | undefined;
    const msgContent = (firstChoice?.message as Record<string, unknown> | undefined)?.content;
    if (typeof msgContent === "string" && msgContent.trim()) return msgContent.trim();
    if (typeof firstChoice?.text === "string" && firstChoice.text.trim()) return firstChoice.text.trim();
  }

  if (Array.isArray(obj.candidates) && obj.candidates.length > 0) {
    const firstCand = obj.candidates[0] as Record<string, unknown> | undefined;
    const parts = (firstCand?.content as Record<string, unknown> | undefined)?.parts;
    if (Array.isArray(parts) && parts.length > 0) {
      const partText = (parts[0] as Record<string, unknown> | undefined)?.text;
      if (typeof partText === "string" && partText.trim()) return partText.trim();
    }
  }

  for (const key of WRAPPER_TEXT_KEYS) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (value && typeof value === "object") {
      const nested = extractFlexibleTextResponse(value, depth + 1);
      if (nested) return nested;
    }
  }

  return "";
};

export const isWebLlmLoaded = (modelId?: string): boolean => {
  if (!webLlmEngine) return false;
  if (!modelId) return Boolean(loadedWebLlmModelId);
  return loadedWebLlmModelId === modelId;
};

export const getLoadedWebLlmModelId = () => loadedWebLlmModelId;

export const checkWebGpuSupport = async (): Promise<{ supported: boolean; reason?: string }> => {
  if (typeof window === "undefined") {
    return { supported: false, reason: "WebGPU hanya tersedia di browser." };
  }

  const nav = navigator as Navigator & {
    gpu?: { requestAdapter?: () => Promise<unknown | null> };
  };

  if (!nav.gpu || typeof nav.gpu.requestAdapter !== "function") {
    return {
      supported: false,
      reason: "Browser atau perangkat ini belum mengaktifkan WebGPU. Kamu bisa memakai tab REST API atau PC Lokal."
    };
  }

  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: "Adapter GPU WebGPU tidak ditemukan. Kamu tetap bisa memakai tab REST API atau PC Lokal."
      };
    }
    return { supported: true };
  } catch {
    return {
      supported: false,
      reason: "Gagal memeriksa dukungan WebGPU di browser."
    };
  }
};

export const checkCachedModels = async (modelIds: string[]): Promise<Record<string, boolean>> => {
  if (typeof window === "undefined" || !modelIds.length) return {};
  try {
    const webllm = await import("@mlc-ai/web-llm");
    const entries = await Promise.all(
      modelIds.map(async (id) => {
        try {
          const cached = await webllm.hasModelInCache(id);
          return [id, cached] as const;
        } catch {
          return [id, false] as const;
        }
      })
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
};

const terminateActiveWorker = () => {
  if (webLlmWorker) {
    try {
      webLlmWorker.terminate();
    } catch {
      // Abaikan kegagalan terminasi worker
    }
    webLlmWorker = null;
  }
};

export const cancelWebLlmDownload = (): void => {
  loadSequence += 1;
  const rejectPending = cancelRejecter;
  cancelRejecter = null;
  terminateActiveWorker();
  webLlmEngine = null;
  loadedWebLlmModelId = "";
  if (rejectPending) {
    rejectPending(new WebLlmCancelledError("Unduhan model dibatalkan."));
  }
};

export const loadWebLlmModel = async (
  modelId: string,
  onProgress?: (progress: { progress: number; text: string }) => void
): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("Model WebLLM hanya bisa dijalankan di browser.");
  }

  const gpuCheck = await checkWebGpuSupport();
  if (!gpuCheck.supported) {
    throw new Error(gpuCheck.reason || "WebGPU tidak tersedia.");
  }

  if (webLlmEngine && loadedWebLlmModelId === modelId) {
    onProgress?.({ progress: 1, text: `Model ${modelId} sudah siap dipakai di memori.` });
    return;
  }

  if (cancelRejecter) {
    cancelWebLlmDownload();
  }

  if (webLlmEngine) {
    try {
      await webLlmEngine.unload();
    } catch {
      // Abaikan error saat melepas model sebelumnya
    }
    webLlmEngine = null;
    loadedWebLlmModelId = "";
  }
  terminateActiveWorker();

  const seq = ++loadSequence;
  const webllm = await import("@mlc-ai/web-llm");
  if (seq !== loadSequence) {
    throw new WebLlmCancelledError("Unduhan model dibatalkan.");
  }

  const worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
    type: "module"
  });
  webLlmWorker = worker;

  const cancelPromise = new Promise<never>((_, reject) => {
    cancelRejecter = reject;
  });

  try {
    const enginePromise = webllm.CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (report: InitProgressReport) => {
        if (seq !== loadSequence) return;
        onProgress?.({
          progress: typeof report.progress === "number" ? report.progress : 0,
          text: report.text || "Memuat model..."
        });
      }
    });

    const engine = await Promise.race([enginePromise, cancelPromise]);
    cancelRejecter = null;

    if (seq !== loadSequence) {
      try {
        await engine.unload();
      } catch {
        // Abaikan cleanup engine usang
      }
      worker.terminate();
      throw new WebLlmCancelledError("Unduhan model dibatalkan.");
    }

    webLlmEngine = engine;
    loadedWebLlmModelId = modelId;
  } catch (err) {
    cancelRejecter = null;
    if (seq !== loadSequence || err instanceof WebLlmCancelledError) {
      terminateActiveWorker();
      throw err instanceof WebLlmCancelledError ? err : new WebLlmCancelledError();
    }
    terminateActiveWorker();
    throw err;
  }
};

export const unloadWebLlmModel = async (): Promise<void> => {
  loadSequence += 1;
  cancelRejecter = null;
  if (webLlmEngine) {
    try {
      await webLlmEngine.unload();
    } catch {
      // Abaikan error saat unload
    }
  }
  terminateActiveWorker();
  webLlmEngine = null;
  loadedWebLlmModelId = "";
};

export const deleteWebLlmModelCache = async (modelId: string): Promise<void> => {
  if (typeof window === "undefined") return;
  if (loadedWebLlmModelId === modelId) {
    await unloadWebLlmModel();
  }
  const webllm = await import("@mlc-ai/web-llm");
  await webllm.deleteModelAllInfoInCache(modelId);
};

export const fetchLocalServerModels = async (
  kind: "ollama" | "lmstudio",
  baseUrl: string
): Promise<string[]> => {
  const base = cleanBaseUrl(baseUrl);
  if (!base) {
    throw new Error("Alamat endpoint server lokal tidak boleh kosong.");
  }

  try {
    const endpoint = kind === "ollama" ? `${base}/api/tags` : `${base}/v1/models`;
    const response = await fetch(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(4500)
    });

    if (!response.ok) {
      throw new Error(`Server membalas dengan status ${response.status}.`);
    }

    const json = await response.json();
    if (kind === "ollama") {
      const models = Array.isArray(json?.models) ? json.models : [];
      return models
        .map((m: { name?: string }) => (typeof m?.name === "string" ? m.name : ""))
        .filter(Boolean);
    }

    const models = Array.isArray(json?.data) ? json.data : [];
    return models
      .map((m: { id?: string }) => (typeof m?.id === "string" ? m.id : ""))
      .filter(Boolean);
  } catch (error) {
    const baseTip =
      kind === "ollama"
        ? "Pastikan Ollama sudah berjalan di PC dan aktifkan OLLAMA_ORIGINS=* jika mengakses dari HTTPS."
        : "Pastikan Local Server di LM Studio sudah aktif (port 1234) dan opsi Enable CORS menyala.";
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new Error(`Tidak dapat terhubung ke ${kind === "ollama" ? "Ollama" : "LM Studio"}${detail}. ${baseTip}`);
  }
};

const formatRestError = (status: number, rawMessage?: string): string => {
  const snippet = rawMessage ? ` (${rawMessage.slice(0, 120)})` : "";
  if (status === 401 || status === 403) {
    return `API key ditolak atau tidak memiliki izin (HTTP ${status})${snippet}.`;
  }
  if (status === 404) {
    return `Endpoint atau nama model tidak ditemukan (HTTP 404)${snippet}. Periksa URL dan nama model.`;
  }
  if (status === 429) {
    return `Batas kuota / rate limit REST API tercapai (HTTP 429)${snippet}.`;
  }
  return `Permintaan REST API gagal dengan status HTTP ${status}${snippet}.`;
};

const extractRawErrorMessage = (parsedJson: unknown, fallbackBody: string): string => {
  const errObj = (parsedJson && typeof parsedJson === "object" ? parsedJson : {}) as Record<string, unknown>;
  if (typeof errObj.error === "string" && errObj.error.trim()) return errObj.error.trim();
  if (typeof errObj.message === "string" && errObj.message.trim()) return errObj.message.trim();
  const nestedErr = errObj.error as Record<string, unknown> | undefined;
  if (typeof nestedErr?.message === "string" && nestedErr.message.trim()) return nestedErr.message.trim();
  return fallbackBody;
};

const runGetQueryCompletion = async (
  config: Extract<ActiveLocalAiConfig, { mode: "rest_api" }>,
  messages: LocalChatMessage[],
  temperature: number
): Promise<string> => {
  const trimmedKey = config.apiKey.trim();
  const cacheKey = getUrlCacheKey(config.baseUrl);
  const hasTemplatePlaceholder = /\{prompt\}|%7Bprompt%7D/i.test(config.baseUrl);

  const executeGetAttempt = async (
    promptParamOverride?: string
  ): Promise<{ status: number; ok: boolean; trimmedBody: string; parsedJson: unknown; rawMsg: string }> => {
    const targetUrl = buildGetQueryUrl(config.baseUrl, messages, temperature, {
      promptParam: promptParamOverride
    });
    const headers: Record<string, string> = {};
    if (trimmedKey) {
      headers.Authorization = `Bearer ${trimmedKey}`;
    }

    let status = 0;
    let ok = false;
    let rawText = "";

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(30000)
      });
      status = response.status;
      ok = response.ok;
      rawText = await response.text();
    } catch (directError) {
      const isNetworkOrCors =
        directError instanceof TypeError ||
        (directError instanceof Error && /failed to fetch|networkerror|load failed/i.test(directError.message));

      if (!isNetworkOrCors || typeof window === "undefined" || !targetUrl.startsWith("https://")) {
        throw directError instanceof Error
          ? directError
          : new Error("Gagal terhubung ke endpoint GET REST API.");
      }

      const proxyRes = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          ...(trimmedKey ? { apiKey: trimmedKey } : {})
        }),
        signal: AbortSignal.timeout(30000)
      });

      const proxyJson = await proxyRes.json().catch(() => ({}));
      if (!proxyRes.ok || !proxyJson?.success) {
        throw new Error(proxyJson?.error?.message || formatRestError(proxyRes.status));
      }

      status = Number(proxyJson.data?.status ?? 200);
      ok = Boolean(proxyJson.data?.ok);
      rawText = typeof proxyJson.data?.body === "string" ? proxyJson.data.body : "";
    }

    const trimmedBody = rawText.trim();
    let parsedJson: unknown = null;
    if (trimmedBody.startsWith("{") || trimmedBody.startsWith("[")) {
      try {
        parsedJson = JSON.parse(trimmedBody);
      } catch {
        parsedJson = null;
      }
    }

    const rawMsg = extractRawErrorMessage(parsedJson, trimmedBody);
    return { status, ok, trimmedBody, parsedJson, rawMsg };
  };

  const cachedParam = hasTemplatePlaceholder ? undefined : detectedPromptParamCache.get(cacheKey);
  let attempt = await executeGetAttempt(cachedParam);

  if (!attempt.ok && (attempt.status === 400 || attempt.status === 422) && !hasTemplatePlaceholder) {
    const detectedParam = detectMissingParamFromError(attempt.rawMsg || attempt.trimmedBody);
    if (detectedParam && detectedParam !== (cachedParam ?? "prompt")) {
      detectedPromptParamCache.set(cacheKey, detectedParam);
      try {
        attempt = await executeGetAttempt(detectedParam);
        if (!attempt.ok) {
          detectedPromptParamCache.delete(cacheKey);
        }
      } catch (retryErr) {
        detectedPromptParamCache.delete(cacheKey);
        throw retryErr;
      }
    }
  }

  if (!attempt.ok) {
    throw new Error(formatRestError(attempt.status, attempt.rawMsg));
  }

  if (attempt.parsedJson !== null && typeof attempt.parsedJson === "object") {
    const record = attempt.parsedJson as Record<string, unknown>;
    const extracted = extractFlexibleTextResponse(attempt.parsedJson);
    if ((record.status === false || record.success === false) && !extracted) {
      const errMsg =
        typeof record.error === "string"
          ? record.error
          : typeof record.message === "string"
          ? record.message
          : "Server mengembalikan status gagal.";
      throw new Error(errMsg);
    }
    if (extracted) return extracted;
  }

  return attempt.trimmedBody;
};

const runRestApiCompletion = async (
  config: Extract<ActiveLocalAiConfig, { mode: "rest_api" }>,
  messages: LocalChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> => {
  if (config.format === "get_query") {
    if (!config.baseUrl.trim()) {
      throw new Error("Isi alamat Endpoint GET URL terlebih dahulu.");
    }
    return runGetQueryCompletion(config, messages, temperature);
  }

  const base = cleanBaseUrl(config.baseUrl);
  const model = config.modelId.trim();
  if (!base || !model) {
    throw new Error("Isi alamat Endpoint REST API dan nama model terlebih dahulu.");
  }

  if (config.format === "gemini") {
    if (!config.apiKey.trim()) {
      throw new Error("API key Google Gemini wajib diisi.");
    }

    const systemText = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    const endpoint = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
      config.apiKey.trim()
    )}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(systemText ? { system_instruction: { parts: [{ text: systemText }] } } : {}),
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(formatRestError(response.status, data?.error?.message));
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : "";
  }

  const endpoint = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  }
  if (base.includes("openrouter.ai")) {
    headers["X-Title"] = "QuickTailor CV";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatRestError(response.status, data?.error?.message));
  }

  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
};

export const testRestApiConnection = async (
  config: Extract<ActiveLocalAiConfig, { mode: "rest_api" }>
): Promise<void> => {
  const reply = await runRestApiCompletion(
    config,
    [{ role: "user", content: "Reply with OK only." }],
    0,
    16
  );
  if (!reply) {
    throw new Error("Server REST API terhubung tetapi tidak mengembalikan teks.");
  }
};

export const runLocalChatCompletion = async (
  config: ActiveLocalAiConfig,
  messages: LocalChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> => {
  const temperature = options?.temperature ?? 0.25;
  const maxTokens = options?.maxTokens ?? 420;

  if (config.mode === "webllm") {
    if (!webLlmEngine || loadedWebLlmModelId !== config.modelId) {
      throw new Error("Model browser belum dimuat. Klik Unduh & Aktifkan Model terlebih dahulu.");
    }
    const completion = await webLlmEngine.chat.completions.create({
      messages,
      temperature,
      max_tokens: maxTokens
    });
    return completion.choices?.[0]?.message?.content?.trim() ?? "";
  }

  if (config.mode === "rest_api") {
    return runRestApiCompletion(config, messages, temperature, maxTokens);
  }

  const base = cleanBaseUrl(config.baseUrl);
  if (!base || !config.modelId.trim()) {
    throw new Error("Pilih model lokal terlebih dahulu sebelum menjalankan optimasi.");
  }

  if (config.mode === "ollama") {
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.modelId,
        messages,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens
        }
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok) {
      throw new Error(`Ollama gagal memproses (${response.status}).`);
    }
    const data = await response.json();
    return typeof data?.message?.content === "string" ? data.message.content.trim() : "";
  }

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    throw new Error(`LM Studio gagal memproses (${response.status}).`);
  }
  const data = await response.json();
  return typeof data?.choices?.[0]?.message?.content === "string"
    ? data.choices[0].message.content.trim()
    : "";
};

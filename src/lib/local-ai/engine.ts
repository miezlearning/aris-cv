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
    if (!state.restApiUrl.trim() || !state.restApiModel.trim()) return null;
    return {
      mode: "rest_api",
      format: state.restApiFormat,
      baseUrl: state.restApiUrl,
      modelId: state.restApiModel,
      apiKey: state.restApiKey || readSessionApiKey()
    };
  }

  return null;
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

const runRestApiCompletion = async (
  config: Extract<ActiveLocalAiConfig, { mode: "rest_api" }>,
  messages: LocalChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> => {
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

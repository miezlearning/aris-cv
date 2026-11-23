import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";

export type LocalChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ActiveLocalAiConfig =
  | { mode: "webllm"; modelId: string }
  | { mode: "ollama" | "lmstudio"; baseUrl: string; modelId: string };

let webLlmEngine: MLCEngineInterface | null = null;
let loadedWebLlmModelId = "";

const cleanBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

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
      reason: "Browser atau perangkat ini belum mengaktifkan WebGPU. Gunakan Chrome/Edge desktop terbaru atau sambungkan ke Ollama / LM Studio."
    };
  }

  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: "Adapter GPU untuk WebGPU tidak ditemukan di perangkat ini. Kamu tetap bisa memakai Ollama/LM Studio atau mode standar."
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

  if (webLlmEngine) {
    try {
      await webLlmEngine.unload();
    } catch {
      // Abaikan error saat melepas model sebelumnya
    }
    webLlmEngine = null;
    loadedWebLlmModelId = "";
  }

  const webllm = await import("@mlc-ai/web-llm");
  const engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report: InitProgressReport) => {
      onProgress?.({
        progress: typeof report.progress === "number" ? report.progress : 0,
        text: report.text || "Memuat model..."
      });
    }
  });

  webLlmEngine = engine;
  loadedWebLlmModelId = modelId;
};

export const unloadWebLlmModel = async (): Promise<void> => {
  if (!webLlmEngine) return;
  try {
    await webLlmEngine.unload();
  } finally {
    webLlmEngine = null;
    loadedWebLlmModelId = "";
  }
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

export const runLocalChatCompletion = async (
  config: ActiveLocalAiConfig,
  messages: LocalChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> => {
  const temperature = options?.temperature ?? 0.25;
  const maxTokens = options?.maxTokens ?? 420;

  if (config.mode === "webllm") {
    if (!webLlmEngine || loadedWebLlmModelId !== config.modelId) {
      throw new Error("Model WebLLM belum dimuat. Klik Unduh & Aktifkan Model terlebih dahulu.");
    }
    const completion = await webLlmEngine.chat.completions.create({
      messages,
      temperature,
      max_tokens: maxTokens
    });
    return completion.choices?.[0]?.message?.content?.trim() ?? "";
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

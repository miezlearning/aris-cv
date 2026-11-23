export type LocalAiProvider = "off" | "webllm" | "rest_api" | "ollama" | "lmstudio";

export type RestApiFormat = "openai" | "gemini";
export type RestApiPresetId = "gemini" | "openrouter" | "groq" | "openai" | "custom";

export type RestApiPreset = {
  id: RestApiPresetId;
  label: string;
  format: RestApiFormat;
  baseUrl: string;
  defaultModel: string;
  keyPlaceholder: string;
};

export const REST_API_PRESETS: RestApiPreset[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    format: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza..."
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    format: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    keyPlaceholder: "sk-or-..."
  },
  {
    id: "groq",
    label: "Groq (Cepat)",
    format: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyPlaceholder: "gsk_..."
  },
  {
    id: "openai",
    label: "OpenAI",
    format: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyPlaceholder: "sk-..."
  },
  {
    id: "custom",
    label: "Custom REST API (OpenAI-Compatible)",
    format: "openai",
    baseUrl: "",
    defaultModel: "",
    keyPlaceholder: "Opsional / Bearer token"
  }
];

export type CuratedWebLlmModel = {
  id: string;
  label: string;
  tier: "ringan" | "seimbang" | "tinggi";
  sizeLabel: string;
  vramLabel: string;
  languages: string;
  bestFor: string;
  recommended?: boolean;
};

export const DEFAULT_WEBLLM_MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export const CURATED_WEBLLM_MODELS: CuratedWebLlmModel[] = [
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 (0.5B Instruct)",
    tier: "ringan",
    sizeLabel: "~400 MB unduh",
    vramLabel: "~0.9 GB VRAM",
    languages: "ID & EN",
    bestFor: "Unduhan tercepat dan cocok untuk laptop RAM 8 GB atau uji coba awal."
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 (1B Instruct)",
    tier: "ringan",
    sizeLabel: "~700 MB unduh",
    vramLabel: "~0.9 GB VRAM",
    languages: "Utama EN",
    bestFor: "Cepat dan responsif untuk penulisan kalimat CV berbahasa Inggris."
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 (1.5B Instruct)",
    tier: "seimbang",
    sizeLabel: "~1.0 GB unduh",
    vramLabel: "~1.6 GB VRAM",
    languages: "ID & EN",
    bestFor: "Paling seimbang untuk penyesuaian kalimat lowongan serta terjemahan 2 arah ID-EN.",
    recommended: true
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    label: "SmolLM2 (1.7B Instruct)",
    tier: "seimbang",
    sizeLabel: "~1.1 GB unduh",
    vramLabel: "~1.8 GB VRAM",
    languages: "Utama EN",
    bestFor: "Ringkas untuk menyusun poin pencapaian berbahasa Inggris."
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC-1k",
    label: "Gemma 2 (2B IT - Low Mem)",
    tier: "seimbang",
    sizeLabel: "~1.3 GB unduh",
    vramLabel: "~1.6 GB VRAM",
    languages: "ID & EN",
    bestFor: "Gaya bahasa rapi untuk ringkasan profil dan parafrase profesional."
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 (3B Instruct)",
    tier: "tinggi",
    sizeLabel: "~1.9 GB unduh",
    vramLabel: "~2.5 GB VRAM",
    languages: "ID & EN",
    bestFor: "Kualitas penulisan dan pemahaman konteks lowongan paling tinggi."
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 (3B Instruct)",
    tier: "tinggi",
    sizeLabel: "~1.8 GB unduh",
    vramLabel: "~2.3 GB VRAM",
    languages: "Utama EN",
    bestFor: "Kualitas kalimat English ATS tingkat lanjut (butuh GPU >= 3 GB VRAM)."
  }
];

export type PrebuiltModelSummary = {
  modelId: string;
  vramMb?: number;
  lowResource?: boolean;
};

export const getAllPrebuiltWebLlmModels = async (): Promise<PrebuiltModelSummary[]> => {
  if (typeof window === "undefined") return [];
  const webllm = await import("@mlc-ai/web-llm");
  const list = webllm.prebuiltAppConfig?.model_list ?? [];
  return list.map((item) => ({
    modelId: item.model_id,
    vramMb: item.vram_required_MB,
    lowResource: item.low_resource_required
  }));
};

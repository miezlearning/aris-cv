"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsClockwise,
  CheckCircle,
  DownloadSimple,
  Globe,
  HardDrives,
  Prohibit,
  SlidersHorizontal,
  Sparkle,
  Trash,
  WarningCircle
} from "@phosphor-icons/react";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";
import {
  WebLlmCancelledError,
  cancelWebLlmDownload,
  checkCachedModels,
  checkWebGpuSupport,
  deleteWebLlmModelCache,
  deriveGetQueryDisplayLabel,
  fetchLocalServerModels,
  isWebLlmLoaded,
  loadWebLlmModel,
  testRestApiConnection,
  unloadWebLlmModel
} from "@/lib/local-ai/engine";
import {
  CURATED_WEBLLM_MODELS,
  REST_API_PRESETS,
  getAllPrebuiltWebLlmModels,
  type PrebuiltModelSummary,
  type RestApiPresetId
} from "@/lib/local-ai/models";
import { useCvStore } from "@/lib/store";

export const LocalAiControlPanel = ({
  contextLabel = "Optimasi & Terjemahan",
  compact = false
}: {
  contextLabel?: string;
  compact?: boolean;
}) => {
  const aiEnabled = useCvStore((state) => state.aiEnabled);
  const localAiMode = useCvStore((state) => state.localAiMode);
  const webLlmModelId = useCvStore((state) => state.webLlmModelId);
  const localServerUrl = useCvStore((state) => state.localServerUrl);
  const localServerModel = useCvStore((state) => state.localServerModel);
  const restApiPreset = useCvStore((state) => state.restApiPreset);
  const restApiFormat = useCvStore((state) => state.restApiFormat);
  const restApiUrl = useCvStore((state) => state.restApiUrl);
  const restApiModel = useCvStore((state) => state.restApiModel);
  const restApiKey = useCvStore((state) => state.restApiKey);
  const setLocalAiConfig = useCvStore((state) => state.setLocalAiConfig);

  const localAiStatus = useCvStore((state) => state.localAiStatus);
  const localAiProgress = useCvStore((state) => state.localAiProgress);
  const localAiProgressText = useCvStore((state) => state.localAiProgressText);
  const localAiLoadedModel = useCvStore((state) => state.localAiLoadedModel);
  const localAiError = useCvStore((state) => state.localAiError);
  const setLocalAiRuntime = useCvStore((state) => state.setLocalAiRuntime);

  const [configOpen, setConfigOpen] = useState(false);
  const [sourceTab, setSourceTab] = useState<"webllm" | "rest_api" | "server">(
    localAiMode === "rest_api"
      ? "rest_api"
      : localAiMode === "ollama" || localAiMode === "lmstudio"
      ? "server"
      : "webllm"
  );

  const [gpuSupport, setGpuSupport] = useState<{ supported: boolean; reason?: string } | null>(null);
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [allModels, setAllModels] = useState<PrebuiltModelSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [serverKind, setServerKind] = useState<"ollama" | "lmstudio">(
    localAiMode === "lmstudio" ? "lmstudio" : "ollama"
  );
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [busyCheck, setBusyCheck] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (aiEnabled && localAiMode === "webllm" && isWebLlmLoaded(webLlmModelId) && localAiStatus !== "ready") {
      setLocalAiRuntime({
        localAiStatus: "ready",
        localAiLoadedModel: webLlmModelId,
        localAiProgress: 100
      });
    }
  }, [aiEnabled, localAiMode, localAiStatus, setLocalAiRuntime, webLlmModelId]);

  useEffect(() => {
    if (!aiEnabled || !configOpen || sourceTab !== "webllm") return;
    let active = true;
    checkWebGpuSupport().then((res) => {
      if (active) setGpuSupport(res);
    });
    const ids = CURATED_WEBLLM_MODELS.map((m) => m.id);
    if (!ids.includes(webLlmModelId)) ids.push(webLlmModelId);
    checkCachedModels(ids).then((map) => {
      if (active) setCachedMap(map);
    });
    return () => {
      active = false;
    };
  }, [aiEnabled, configOpen, sourceTab, webLlmModelId]);

  const isReady = aiEnabled && localAiStatus === "ready" && localAiMode !== "off";
  const isDownloading = localAiStatus === "downloading";

  const handleMasterToggle = async () => {
    setNotice("");
    if (aiEnabled) {
      if (isDownloading) {
        cancelWebLlmDownload();
      } else if (localAiMode === "webllm") {
        await unloadWebLlmModel();
      }
      setLocalAiConfig({ aiEnabled: false });
      setLocalAiRuntime({
        localAiStatus: "idle",
        localAiProgress: 0,
        localAiProgressText: "",
        localAiLoadedModel: "",
        localAiError: ""
      });
      setConfigOpen(false);
      return;
    }

    setLocalAiConfig({ aiEnabled: true });
    setLocalAiRuntime({ localAiError: "" });
    setConfigOpen(true);
  };

  const handleLoadWebLlm = async () => {
    const chosenId = webLlmModelId.trim();
    if (!chosenId) return;

    setNotice("");
    setLocalAiConfig({ aiEnabled: true, localAiMode: "webllm", webLlmModelId: chosenId });
    setLocalAiRuntime({
      localAiStatus: "downloading",
      localAiProgress: 0,
      localAiProgressText: "Memeriksa cache & menyiapkan worker browser...",
      localAiError: ""
    });

    try {
      await loadWebLlmModel(chosenId, (report) => {
        setLocalAiRuntime({
          localAiStatus: "downloading",
          localAiProgress: Math.round(Math.max(0, Math.min(1, report.progress)) * 100),
          localAiProgressText: report.text
        });
      });
      setCachedMap((prev) => ({ ...prev, [chosenId]: true }));
      setLocalAiRuntime({
        localAiStatus: "ready",
        localAiProgress: 100,
        localAiProgressText: "",
        localAiLoadedModel: chosenId,
        localAiError: ""
      });
      setConfigOpen(false);
    } catch (error) {
      if (error instanceof WebLlmCancelledError) {
        setLocalAiRuntime({
          localAiStatus: "idle",
          localAiProgress: 0,
          localAiProgressText: "",
          localAiError: ""
        });
        setNotice("Unduhan model dibatalkan.");
        return;
      }

      setLocalAiRuntime({
        localAiStatus: "error",
        localAiProgress: 0,
        localAiProgressText: "",
        localAiError:
          error instanceof Error
            ? error.message
            : "Gagal memuat model di browser. Periksa WebGPU atau coba tab REST API."
      });
    }
  };

  const handleCancelDownload = () => {
    cancelWebLlmDownload();
    setLocalAiRuntime({
      localAiStatus: "idle",
      localAiProgress: 0,
      localAiProgressText: "",
      localAiError: ""
    });
    setNotice("Unduhan model dibatalkan.");
  };

  const handleDeleteCache = async () => {
    await deleteWebLlmModelCache(webLlmModelId);
    setCachedMap((prev) => ({ ...prev, [webLlmModelId]: false }));
    if (localAiLoadedModel === webLlmModelId) {
      setLocalAiRuntime({
        localAiStatus: "idle",
        localAiProgress: 0,
        localAiProgressText: "",
        localAiLoadedModel: ""
      });
    }
    setNotice("Cache model dihapus dari penyimpanan browser.");
  };

  const handleToggleFullCatalog = async (checked: boolean) => {
    setShowFullCatalog(checked);
    if (checked && allModels.length === 0) {
      setCatalogLoading(true);
      try {
        setAllModels(await getAllPrebuiltWebLlmModels());
      } finally {
        setCatalogLoading(false);
      }
    }
  };

  const handlePresetChange = (presetId: RestApiPresetId) => {
    const preset = REST_API_PRESETS.find((p) => p.id === presetId) ?? REST_API_PRESETS[0];
    setLocalAiConfig({
      restApiPreset: preset.id,
      restApiFormat: preset.format,
      restApiUrl: preset.baseUrl,
      restApiModel: preset.defaultModel
    });
    setLocalAiRuntime({ localAiError: "" });
  };

  const handleActivateRestApi = async () => {
    setNotice("");
    setBusyCheck(true);
    setLocalAiRuntime({ localAiError: "" });
    const isGet = restApiFormat === "get_query";
    const resolvedModelLabel = isGet
      ? deriveGetQueryDisplayLabel(restApiUrl, restApiModel)
      : restApiModel.trim();

    try {
      await testRestApiConnection({
        mode: "rest_api",
        format: restApiFormat,
        baseUrl: restApiUrl,
        modelId: resolvedModelLabel,
        apiKey: restApiKey
      });
      setLocalAiConfig({ aiEnabled: true, localAiMode: "rest_api" });
      setLocalAiRuntime({
        localAiStatus: "ready",
        localAiLoadedModel: isGet
          ? `${resolvedModelLabel} (GET API)`
          : `${resolvedModelLabel} (REST)`,
        localAiProgress: 100,
        localAiError: ""
      });
      setConfigOpen(false);
    } catch (error) {
      setLocalAiRuntime({
        localAiStatus: "error",
        localAiError:
          error instanceof Error ? error.message : "Gagal menghubungkan endpoint REST API."
      });
    } finally {
      setBusyCheck(false);
    }
  };

  const handleFetchServerModels = async () => {
    setNotice("");
    setBusyCheck(true);
    setLocalAiRuntime({ localAiError: "" });
    try {
      const list = await fetchLocalServerModels(serverKind, localServerUrl);
      setDiscoveredModels(list);
      if (list.length > 0 && (!localServerModel || !list.includes(localServerModel))) {
        setLocalAiConfig({ localServerModel: list[0] });
      }
      if (list.length === 0) {
        setLocalAiRuntime({
          localAiError: "Terhubung, tetapi belum ada model terpasang di server lokal tersebut."
        });
      }
    } catch (error) {
      setDiscoveredModels([]);
      setLocalAiRuntime({
        localAiError: error instanceof Error ? error.message : "Gagal mengambil daftar model lokal."
      });
    } finally {
      setBusyCheck(false);
    }
  };

  const handleActivateServer = async () => {
    setNotice("");
    setBusyCheck(true);
    setLocalAiRuntime({ localAiError: "" });
    try {
      await fetchLocalServerModels(serverKind, localServerUrl);
      setLocalAiConfig({ aiEnabled: true, localAiMode: serverKind });
      setLocalAiRuntime({
        localAiStatus: "ready",
        localAiLoadedModel: `${serverKind === "ollama" ? "Ollama" : "LM Studio"}: ${localServerModel}`,
        localAiProgress: 100,
        localAiError: ""
      });
      setConfigOpen(false);
    } catch (error) {
      setLocalAiRuntime({
        localAiStatus: "error",
        localAiError: error instanceof Error ? error.message : "Gagal menghubungkan server AI lokal."
      });
    } finally {
      setBusyCheck(false);
    }
  };

  const isSelectedCached = Boolean(cachedMap[webLlmModelId]);
  const activePresetMeta = REST_API_PRESETS.find((p) => p.id === restApiPreset) ?? REST_API_PRESETS[0];
  const isGetQuery = restApiFormat === "get_query";

  return (
    <div className="rounded-xl border border-[#D9CEBC] bg-[#FFFDF8] px-3.5 py-2.5 sm:px-4 sm:py-3">
      {/* Slim Master Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className={`grid ${compact ? "h-8 w-8" : "h-9 w-9"} shrink-0 place-items-center rounded-lg border ${
              isReady
                ? "border-[#9FD499] bg-[#DFF5DA] text-[#144C32]"
                : aiEnabled
                ? "border-[#DFC25A] bg-[#FFF0A8] text-[#4A3A2E]"
                : "border-[#D9CEBC] bg-[#FAF5E8] text-[#59483F]"
            }`}
          >
            <Sparkle size={16} weight="duotone" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-[#251813]">Asisten AI</span>
              {!aiEnabled ? (
                <span className="text-xs text-[#59483F]">Nonaktif (mode standar cepat)</span>
              ) : isDownloading ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#DFC25A] bg-[#FFF0A8] px-2 py-0.5 text-[11px] font-bold text-[#4A3A2E]">
                  <ArrowsClockwise size={11} className="animate-spin" aria-hidden="true" />
                  <span>Mengunduh {localAiProgress}%</span>
                </span>
              ) : isReady ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#9FD499] bg-[#DFF5DA] px-2 py-0.5 text-[11px] font-bold text-[#144C32] max-w-[230px] truncate">
                  <CheckCircle size={12} weight="fill" className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{localAiLoadedModel}</span>
                </span>
              ) : (
                <span className="rounded-md border border-[#DFC25A] bg-[#FFF8DF] px-2 py-0.5 text-[11px] font-semibold text-[#4A3A2E]">
                  Belum terhubung ({contextLabel})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {aiEnabled ? (
            <button
              type="button"
              onClick={() => setConfigOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 min-h-[38px] rounded-lg border border-[#D9CEBC] bg-white px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FAF5E8] transition-colors"
            >
              <SlidersHorizontal size={13} weight="bold" aria-hidden="true" />
              <span>{configOpen ? "Tutup" : "Atur"}</span>
            </button>
          ) : null}

          <button
            type="button"
            role="switch"
            aria-checked={aiEnabled}
            aria-label="Aktifkan Asisten AI"
            onClick={handleMasterToggle}
            className={`inline-flex items-center gap-2 min-h-[40px] rounded-full border px-2.5 transition-colors ${
              aiEnabled
                ? "border-[#144C32] bg-[#1F6B57] text-white"
                : "border-[#C2B49E] bg-[#F3E7C8] text-[#4E3E36]"
            }`}
          >
            <span className="text-[11px] font-bold">{aiEnabled ? "ON" : "OFF"}</span>
            <span
              aria-hidden="true"
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-2xs transition-transform ${
                aiEnabled ? "translate-x-0.5" : "-translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Download Progress with Instant Cancel Button */}
      {isDownloading ? (
        <div className="mt-2.5 rounded-lg border border-[#DFC25A] bg-[#FFF8DF] p-2.5 grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#4A3A2E]">
              Mengunduh ke cache browser ({localAiProgress}%)
            </span>
            <Button
              type="button"
              variant="danger"
              onClick={handleCancelDownload}
              className="min-h-[34px] py-1 px-2.5 text-xs gap-1"
            >
              <Prohibit size={13} weight="bold" aria-hidden="true" />
              <span>Batalkan</span>
            </Button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white border border-[#D9CEBC]">
            <div
              className="h-full bg-[#1F6B57] transition-all duration-300"
              style={{ width: `${localAiProgress}%` }}
            />
          </div>
          {localAiProgressText ? (
            <p className="text-[11px] text-[#59483F] truncate">{localAiProgressText}</p>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p className="mt-2 rounded-lg border border-[#D9CEBC] bg-[#FAF5E8] px-3 py-1.5 text-xs font-semibold text-[#4E3E36]">
          {notice}
        </p>
      ) : null}

      {localAiError ? (
        <div
          role="alert"
          className="mt-2 rounded-lg border border-[#E9A590] bg-[#FFE3D8] px-3 py-2 text-xs font-semibold text-[#7B1F14] flex items-start gap-2"
        >
          <WarningCircle size={15} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{localAiError}</span>
        </div>
      ) : null}

      {/* Compact Expandable Config Drawer */}
      <AnimatePresence initial={false}>
        {aiEnabled && configOpen ? (
          <motion.div
            key="compact-ai-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-[#D9CEBC] pt-3 grid gap-3">
              {/* 3 Compact Source Tabs */}
              <div
                role="tablist"
                aria-label="Pilih sumber AI"
                className="inline-flex flex-wrap gap-1 rounded-xl border border-[#D9CEBC] bg-[#F3E7C8] p-1 w-fit"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={sourceTab === "webllm"}
                  onClick={() => setSourceTab("webllm")}
                  className={`inline-flex items-center gap-1.5 min-h-[38px] rounded-lg px-3 text-xs font-bold transition-colors ${
                    sourceTab === "webllm" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
                  }`}
                >
                  <DownloadSimple size={14} weight="duotone" aria-hidden="true" />
                  <span>Browser (Offline)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sourceTab === "rest_api"}
                  onClick={() => setSourceTab("rest_api")}
                  className={`inline-flex items-center gap-1.5 min-h-[38px] rounded-lg px-3 text-xs font-bold transition-colors ${
                    sourceTab === "rest_api" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
                  }`}
                >
                  <Globe size={14} weight="duotone" aria-hidden="true" />
                  <span>REST API</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sourceTab === "server"}
                  onClick={() => setSourceTab("server")}
                  className={`inline-flex items-center gap-1.5 min-h-[38px] rounded-lg px-3 text-xs font-bold transition-colors ${
                    sourceTab === "server" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
                  }`}
                >
                  <HardDrives size={14} weight="duotone" aria-hidden="true" />
                  <span>PC Lokal</span>
                </button>
              </div>

              {/* Tab 1: WebLLM Browser */}
              {sourceTab === "webllm" ? (
                <div className="grid gap-2.5">
                  {gpuSupport && !gpuSupport.supported ? (
                    <p className="rounded-lg border border-[#DFC25A] bg-[#FFF0A8] px-3 py-2 text-xs font-semibold text-[#4A3A2E]">
                      {gpuSupport.reason}
                    </p>
                  ) : null}

                  <Field
                    label="Pilih model browser"
                    hint="Diunduh sekali lalu berjalan offline di perangkat."
                  >
                    {!showFullCatalog ? (
                      <SelectInput
                        value={webLlmModelId}
                        onChange={(event) => setLocalAiConfig({ webLlmModelId: event.target.value })}
                      >
                        {CURATED_WEBLLM_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} ({m.sizeLabel}, {m.languages})
                            {cachedMap[m.id] ? " [Tersimpan]" : ""}
                          </option>
                        ))}
                      </SelectInput>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <SelectInput
                          value={webLlmModelId}
                          onChange={(event) => setLocalAiConfig({ webLlmModelId: event.target.value })}
                        >
                          {catalogLoading ? (
                            <option value={webLlmModelId}>Memuat daftar model WebLLM...</option>
                          ) : (
                            allModels.map((item) => (
                              <option key={item.modelId} value={item.modelId}>
                                {item.modelId}
                                {item.vramMb ? ` (${Math.round(item.vramMb)} MB)` : ""}
                              </option>
                            ))
                          )}
                        </SelectInput>
                        <TextInput
                          value={webLlmModelId}
                          onChange={(event) => setLocalAiConfig({ webLlmModelId: event.target.value })}
                          placeholder="Ketik Model ID WebLLM..."
                        />
                      </div>
                    )}
                  </Field>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#4E3E36] cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={showFullCatalog}
                      onChange={(event) => handleToggleFullCatalog(event.target.checked)}
                      className="checkbox checkbox-xs border-[#251813]/40 checked:bg-[#1F6B57]"
                    />
                    <span>Tampilkan seluruh katalog model WebLLM / Model ID kustom</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {!isDownloading ? (
                      <Button type="button" onClick={handleLoadWebLlm} className="min-h-[40px] text-xs gap-1.5">
                        <DownloadSimple size={15} weight="bold" aria-hidden="true" />
                        <span>{isSelectedCached ? "Muat dari Cache & Aktifkan" : "Unduh & Aktifkan"}</span>
                      </Button>
                    ) : null}

                    {isSelectedCached && !isDownloading ? (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={handleDeleteCache}
                        className="min-h-[40px] text-xs gap-1.5"
                      >
                        <Trash size={14} weight="duotone" aria-hidden="true" />
                        <span>Hapus Cache</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Tab 2: Direct REST API */}
              {sourceTab === "rest_api" ? (
                <div className="grid gap-3">
                  <div className="grid gap-2.5 sm:grid-cols-2 items-start">
                    <Field label="Provider REST API">
                      <SelectInput
                        value={restApiPreset}
                        onChange={(event) => handlePresetChange(event.target.value as RestApiPresetId)}
                      >
                        {REST_API_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>

                    <Field label={isGetQuery ? "Label model (opsional)" : "Nama model"}>
                      <TextInput
                        value={restApiModel}
                        onChange={(event) => setLocalAiConfig({ restApiModel: event.target.value })}
                        placeholder={
                          isGetQuery
                            ? "Otomatis dari URL (misal: glm47flash)"
                            : "Contoh: gemini-2.5-flash atau gpt-4o-mini"
                        }
                      />
                    </Field>

                    <Field
                      label={isGetQuery ? "API Key (opsional)" : "API Key"}
                      hint={isGetQuery ? "Kosongkan jika API publik tanpa key." : "Tersimpan hanya di tab ini."}
                    >
                      <TextInput
                        type="password"
                        value={restApiKey}
                        onChange={(event) => setLocalAiConfig({ restApiKey: event.target.value })}
                        placeholder={activePresetMeta.keyPlaceholder}
                        autoComplete="off"
                      />
                    </Field>

                    <Field
                      label={isGetQuery ? "Endpoint GET URL" : "Endpoint Base URL"}
                      hint={
                        isGetQuery
                          ? "Boleh tempel URL lengkap beserta contoh ?prompt=...; parameter akan diisi otomatis."
                          : undefined
                      }
                    >
                      <TextInput
                        value={restApiUrl}
                        onChange={(event) => setLocalAiConfig({ restApiUrl: event.target.value })}
                        placeholder={
                          isGetQuery
                            ? "https://api.siputzx.my.id/api/ai/glm47flash"
                            : "https://api.openai.com/v1"
                        }
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      disabled={busyCheck || !restApiUrl.trim() || (!isGetQuery && !restApiModel.trim())}
                      onClick={handleActivateRestApi}
                      className="min-h-[40px] text-xs gap-1.5"
                    >
                      <Globe size={15} weight="duotone" aria-hidden="true" />
                      <span>{busyCheck ? "Menguji koneksi..." : "Tes & Aktifkan"}</span>
                    </Button>
                    <span className="text-[11px] text-[#59483F]">
                      {isGetQuery
                        ? "Kirim ?prompt, ?system, & ?temperature (fallback proxy otomatis jika kena CORS)."
                        : "Langsung dari browser ke API."}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Tab 3: Local PC Server (Ollama / LM Studio) */}
              {sourceTab === "server" ? (
                <div className="grid gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-[#D9CEBC] bg-[#F3E7C8] p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setServerKind("ollama");
                          setLocalAiConfig({ localServerUrl: "http://localhost:11434" });
                        }}
                        className={`min-h-[34px] rounded-md px-3 text-xs font-bold ${
                          serverKind === "ollama" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
                        }`}
                      >
                        Ollama
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setServerKind("lmstudio");
                          setLocalAiConfig({ localServerUrl: "http://localhost:1234" });
                        }}
                        className={`min-h-[34px] rounded-md px-3 text-xs font-bold ${
                          serverKind === "lmstudio" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
                        }`}
                      >
                        LM Studio
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 items-start">
                    <Field label="Alamat server lokal">
                      <TextInput
                        value={localServerUrl}
                        onChange={(event) => setLocalAiConfig({ localServerUrl: event.target.value })}
                        placeholder={
                          serverKind === "ollama" ? "http://localhost:11434" : "http://localhost:1234"
                        }
                      />
                    </Field>

                    {discoveredModels.length > 0 ? (
                      <Field label="Model terpasang">
                        <SelectInput
                          value={localServerModel}
                          onChange={(event) => setLocalAiConfig({ localServerModel: event.target.value })}
                        >
                          {discoveredModels.map((modelName) => (
                            <option key={modelName} value={modelName}>
                              {modelName}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                    ) : (
                      <Field label="Nama model">
                        <TextInput
                          value={localServerModel}
                          onChange={(event) => setLocalAiConfig({ localServerModel: event.target.value })}
                          placeholder="qwen2.5:3b"
                        />
                      </Field>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyCheck}
                      onClick={handleFetchServerModels}
                      className="min-h-[40px] text-xs gap-1.5"
                    >
                      <ArrowsClockwise size={14} weight="bold" aria-hidden="true" />
                      <span>{busyCheck ? "Mengecek..." : "Cek Model"}</span>
                    </Button>

                    <Button
                      type="button"
                      disabled={busyCheck || !localServerModel.trim()}
                      onClick={handleActivateServer}
                      className="min-h-[40px] text-xs gap-1.5"
                    >
                      <HardDrives size={14} weight="duotone" aria-hidden="true" />
                      <span>Aktifkan</span>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

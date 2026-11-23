"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsClockwise,
  CaretDown,
  CheckCircle,
  Cpu,
  DownloadSimple,
  HardDrives,
  Lightning,
  PlugsConnected,
  Trash,
  WarningCircle
} from "@phosphor-icons/react";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";
import {
  checkCachedModels,
  checkWebGpuSupport,
  deleteWebLlmModelCache,
  fetchLocalServerModels,
  isWebLlmLoaded,
  loadWebLlmModel,
  unloadWebLlmModel
} from "@/lib/local-ai/engine";
import {
  CURATED_WEBLLM_MODELS,
  getAllPrebuiltWebLlmModels,
  type PrebuiltModelSummary
} from "@/lib/local-ai/models";
import { useCvStore } from "@/lib/store";

const TIER_STYLES = {
  ringan: "bg-[#DFF5DA] text-[#144C32] border-[#9FD499]",
  seimbang: "bg-[#D6F3FA] text-[#124959] border-[#94D1DF]",
  tinggi: "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]"
} as const;

export const LocalAiControlPanel = ({
  contextLabel = "Optimasi Kalimat & Terjemahan",
  compact = false
}: {
  contextLabel?: string;
  compact?: boolean;
}) => {
  const localAiMode = useCvStore((state) => state.localAiMode);
  const webLlmModelId = useCvStore((state) => state.webLlmModelId);
  const localServerUrl = useCvStore((state) => state.localServerUrl);
  const localServerModel = useCvStore((state) => state.localServerModel);
  const setLocalAiConfig = useCvStore((state) => state.setLocalAiConfig);

  const localAiStatus = useCvStore((state) => state.localAiStatus);
  const localAiProgress = useCvStore((state) => state.localAiProgress);
  const localAiProgressText = useCvStore((state) => state.localAiProgressText);
  const localAiLoadedModel = useCvStore((state) => state.localAiLoadedModel);
  const localAiError = useCvStore((state) => state.localAiError);
  const setLocalAiRuntime = useCvStore((state) => state.setLocalAiRuntime);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"webllm" | "server">(
    localAiMode === "ollama" || localAiMode === "lmstudio" ? "server" : "webllm"
  );
  const [gpuSupport, setGpuSupport] = useState<{ supported: boolean; reason?: string } | null>(null);
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [allModels, setAllModels] = useState<PrebuiltModelSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [serverKind, setServerKind] = useState<"ollama" | "lmstudio">(
    localAiMode === "lmstudio" ? "lmstudio" : "ollama"
  );
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [serverChecking, setServerChecking] = useState(false);

  useEffect(() => {
    if (localAiMode === "webllm" && isWebLlmLoaded(webLlmModelId) && localAiStatus !== "ready") {
      setLocalAiRuntime({
        localAiStatus: "ready",
        localAiLoadedModel: webLlmModelId,
        localAiProgress: 100
      });
    }
  }, [localAiMode, localAiStatus, setLocalAiRuntime, webLlmModelId]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, webLlmModelId]);

  const handleLoadWebLlm = async (targetModelId = webLlmModelId) => {
    const chosenId = targetModelId.trim();
    if (!chosenId) return;

    setLocalAiConfig({ localAiMode: "webllm", webLlmModelId: chosenId });
    setLocalAiRuntime({
      localAiStatus: "downloading",
      localAiProgress: 0,
      localAiProgressText: "Mempersiapkan engine WebGPU & memeriksa cache browser...",
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
        localAiProgressText: "Model siap digunakan di browser tanpa unduh ulang.",
        localAiLoadedModel: chosenId,
        localAiError: ""
      });
    } catch (error) {
      setLocalAiRuntime({
        localAiStatus: "error",
        localAiProgress: 0,
        localAiProgressText: "",
        localAiError:
          error instanceof Error
            ? error.message
            : "Gagal memuat model di browser. Periksa dukungan WebGPU atau memori perangkat."
      });
    }
  };

  const handleUnloadAll = async () => {
    await unloadWebLlmModel();
    setLocalAiConfig({ localAiMode: "off" });
    setLocalAiRuntime({
      localAiStatus: "idle",
      localAiProgress: 0,
      localAiProgressText: "",
      localAiLoadedModel: "",
      localAiError: ""
    });
  };

  const handleDeleteCache = async (targetId: string) => {
    await deleteWebLlmModelCache(targetId);
    setCachedMap((prev) => ({ ...prev, [targetId]: false }));
    if (localAiLoadedModel === targetId) {
      setLocalAiConfig({ localAiMode: "off" });
      setLocalAiRuntime({
        localAiStatus: "idle",
        localAiProgress: 0,
        localAiProgressText: "",
        localAiLoadedModel: ""
      });
    }
  };

  const handleToggleCatalog = async () => {
    const nextOpen = !catalogOpen;
    setCatalogOpen(nextOpen);
    if (nextOpen && allModels.length === 0) {
      setCatalogLoading(true);
      try {
        const list = await getAllPrebuiltWebLlmModels();
        setAllModels(list);
      } finally {
        setCatalogLoading(false);
      }
    }
  };

  const handleFetchServerModels = async () => {
    setServerChecking(true);
    setLocalAiRuntime({ localAiError: "" });
    try {
      const list = await fetchLocalServerModels(serverKind, localServerUrl);
      setDiscoveredModels(list);
      if (list.length > 0 && (!localServerModel || !list.includes(localServerModel))) {
        setLocalAiConfig({ localServerModel: list[0] });
      }
      if (list.length === 0) {
        setLocalAiRuntime({
          localAiError:
            serverKind === "ollama"
              ? "Terhubung ke Ollama, tetapi belum ada model terpasang. Jalankan contoh: ollama pull qwen2.5:3b"
              : "Terhubung ke LM Studio, tetapi belum ada model yang dimuat ke server lokal."
        });
      }
    } catch (error) {
      setDiscoveredModels([]);
      setLocalAiRuntime({
        localAiError:
          error instanceof Error ? error.message : "Gagal memeriksa daftar model server lokal."
      });
    } finally {
      setServerChecking(false);
    }
  };

  const handleActivateServer = async () => {
    if (!localServerModel.trim()) {
      setLocalAiRuntime({
        localAiError: "Pilih atau tulis nama model terlebih dahulu (lalu klik Cek Daftar Model)."
      });
      return;
    }
    setServerChecking(true);
    setLocalAiRuntime({ localAiError: "" });
    try {
      await fetchLocalServerModels(serverKind, localServerUrl);
      setLocalAiConfig({ localAiMode: serverKind });
      setLocalAiRuntime({
        localAiStatus: "ready",
        localAiLoadedModel: `${serverKind === "ollama" ? "Ollama" : "LM Studio"}: ${localServerModel}`,
        localAiProgress: 100,
        localAiProgressText: "Terhubung ke model lokal di PC kamu."
      });
    } catch (error) {
      setLocalAiRuntime({
        localAiStatus: "error",
        localAiError:
          error instanceof Error ? error.message : "Gagal menghubungkan server AI lokal."
      });
    } finally {
      setServerChecking(false);
    }
  };

  const isSelectedWebLlmCached = Boolean(cachedMap[webLlmModelId]);
  const isReady = localAiStatus === "ready" && localAiMode !== "off";
  const isDownloading = localAiStatus === "downloading";

  return (
    <div className="rounded-xl border border-[#DFC25A] bg-[#FFFDF8] p-3.5 sm:p-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className={`grid ${compact ? "h-8 w-8" : "h-9 w-9"} shrink-0 place-items-center rounded-xl border border-[#251813]/25 ${
              isReady ? "bg-[#DFF5DA] text-[#144C32]" : "bg-[#FFF0A8] text-[#4A3A2E]"
            }`}
          >
            <Cpu size={compact ? 17 : 19} weight="duotone" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-[#251813]">
                AI Lokal di Browser / PC Kamu ({contextLabel})
              </p>
              {isReady ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#9FD499] bg-[#DFF5DA] px-2 py-0.5 text-[11px] font-bold text-[#144C32]">
                  <CheckCircle size={12} weight="fill" aria-hidden="true" />
                  <span>Aktif: {localAiLoadedModel || webLlmModelId}</span>
                </span>
              ) : isDownloading ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#DFC25A] bg-[#FFF0A8] px-2 py-0.5 text-[11px] font-bold text-[#4A3A2E]">
                  <ArrowsClockwise size={12} className="animate-spin" aria-hidden="true" />
                  <span>Menyiapkan Model ({localAiProgress}%)</span>
                </span>
              ) : (
                <span className="rounded-md border border-[#D9CEBC] bg-[#FAF5E8] px-2 py-0.5 text-[11px] font-semibold text-[#59483F]">
                  Mode Standar (Cepat & Tanpa Unduhan)
                </span>
              )}
            </div>
            <p className="text-xs text-[#59483F] mt-0.5 leading-relaxed">
              Unduh model 1x ke cache browser (cepat di sesi berikutnya) atau sambungkan model PC kamu (Ollama / LM Studio). 100% privat tanpa API berbayar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isReady && !isDownloading && localAiMode === "webllm" && webLlmModelId ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleLoadWebLlm(webLlmModelId)}
              className="min-h-[40px] text-xs gap-1.5 bg-[#DFF5DA] border-[#9FD499] text-[#144C32]"
            >
              <Lightning size={14} weight="duotone" aria-hidden="true" />
              <span>Aktifkan Model Tersimpan</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="min-h-[42px] text-xs gap-1.5"
          >
            <span>{open ? "Tutup Pengaturan AI" : "Pilih / Atur Model AI"}</span>
            <CaretDown
              size={14}
              weight="bold"
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {/* Progress Bar when Downloading/Loading */}
      {isDownloading ? (
        <div className="mt-3 rounded-lg border border-[#DFC25A] bg-[#FFF8DF] p-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#4A3A2E] mb-1.5">
            <span>Mengunduh / Mengompilasi Model ke Cache Browser</span>
            <span>{localAiProgress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white border border-[#D9CEBC]">
            <div
              className="h-full bg-[#1F6B57] transition-all duration-300"
              style={{ width: `${localAiProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#59483F] break-all">
            {localAiProgressText || "Menyiapkan bobot model..."}
          </p>
        </div>
      ) : null}

      {localAiError ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-[#E9A590] bg-[#FFE3D8] px-3 py-2 text-xs font-semibold text-[#7B1F14] flex items-start gap-2"
        >
          <WarningCircle size={16} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{localAiError}</span>
        </div>
      ) : null}

      {/* Expandable Engine Configuration Drawer */}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="local-ai-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-[#D9CEBC] pt-4 grid gap-4">
              {/* Engine Tabs */}
              <div
                role="tablist"
                aria-label="Sumber model AI lokal"
                className="inline-flex flex-wrap gap-1.5 rounded-xl border border-[#D9CEBC] bg-[#F3E7C8] p-1 w-fit"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "webllm"}
                  onClick={() => setTab("webllm")}
                  className={`inline-flex items-center gap-1.5 min-h-[40px] rounded-lg px-3.5 text-xs font-bold transition-colors ${
                    tab === "webllm"
                      ? "bg-white text-[#251813] shadow-2xs"
                      : "text-[#4E3E36] hover:text-[#251813]"
                  }`}
                >
                  <DownloadSimple size={15} weight="duotone" aria-hidden="true" />
                  <span>Unduh Model di Browser (WebGPU)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "server"}
                  onClick={() => setTab("server")}
                  className={`inline-flex items-center gap-1.5 min-h-[40px] rounded-lg px-3.5 text-xs font-bold transition-colors ${
                    tab === "server"
                      ? "bg-white text-[#251813] shadow-2xs"
                      : "text-[#4E3E36] hover:text-[#251813]"
                  }`}
                >
                  <HardDrives size={15} weight="duotone" aria-hidden="true" />
                  <span>Pakai Model di PC (Ollama / LM Studio)</span>
                </button>
              </div>

              {tab === "webllm" ? (
                <div className="grid gap-3.5">
                  {gpuSupport && !gpuSupport.supported ? (
                    <div className="rounded-xl border border-[#DFC25A] bg-[#FFF0A8] p-3 text-xs font-semibold text-[#4A3A2E]">
                      {gpuSupport.reason}
                    </div>
                  ) : null}

                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {CURATED_WEBLLM_MODELS.map((m) => {
                      const selected = webLlmModelId === m.id;
                      const isCached = Boolean(cachedMap[m.id]);
                      const isLoadedNow = isReady && localAiLoadedModel === m.id;

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLocalAiConfig({ webLlmModelId: m.id })}
                          aria-pressed={selected}
                          className={`text-left rounded-xl p-3 transition-all cursor-pointer min-h-[44px] flex flex-col justify-between ${
                            selected
                              ? "border-2 border-[#251813] bg-[#FFF8DF] shadow-[2px_3px_0_rgba(37,24,19,0.12)]"
                              : "border border-[#D9CEBC] bg-white hover:border-[#251813]/40"
                          }`}
                        >
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                              <span
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${TIER_STYLES[m.tier]}`}
                              >
                                {m.tier}
                              </span>
                              <div className="flex items-center gap-1">
                                {m.recommended ? (
                                  <span className="rounded-md bg-[#251813] px-1.5 py-0.5 text-[10px] font-bold text-[#FFF0A8]">
                                    Rekomendasi
                                  </span>
                                ) : null}
                                {isLoadedNow ? (
                                  <span className="rounded-md bg-[#1F6B57] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    Aktif
                                  </span>
                                ) : isCached ? (
                                  <span className="rounded-md border border-[#9FD499] bg-[#DFF5DA] px-1.5 py-0.5 text-[10px] font-bold text-[#144C32]">
                                    Tersimpan
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <p className="text-xs font-bold text-[#251813]">{m.label}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-[#59483F]">
                              {m.sizeLabel} | {m.vramLabel} | {m.languages}
                            </p>
                            <p className="mt-1 text-[11px] text-[#4E3E36] leading-snug">{m.bestFor}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Full Catalog / Custom Model ID Drawer */}
                  <div className="rounded-xl border border-[#D9CEBC] bg-white p-3 grid gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#251813]">
                        Ingin model lain dari koleksi WebLLM (DeepSeek, Phi, Qwen 7B, dll.)?
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleCatalog}
                        className="text-xs font-bold text-[#144C32] hover:underline"
                      >
                        {catalogOpen ? "Sembunyikan Katalog Lengkap" : "Buka Katalog Lengkap WebLLM"}
                      </button>
                    </div>

                    {catalogOpen ? (
                      <div className="grid gap-2.5 sm:grid-cols-2 items-start pt-1">
                        <Field label="Pilih Model ID dari WebLLM" hint="Daftar lengkap model bawaan MLC WebLLM.">
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
                                  {item.vramMb ? ` (${Math.round(item.vramMb)} MB VRAM)` : ""}
                                </option>
                              ))
                            )}
                          </SelectInput>
                        </Field>
                        <Field label="Atau ketik Model ID langsung" hint="Contoh: Qwen2.5-1.5B-Instruct-q4f16_1-MLC">
                          <TextInput
                            value={webLlmModelId}
                            onChange={(event) => setLocalAiConfig({ webLlmModelId: event.target.value })}
                            placeholder="Qwen2.5-1.5B-Instruct-q4f16_1-MLC"
                          />
                        </Field>
                      </div>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleLoadWebLlm(webLlmModelId)}
                      className="gap-1.5"
                    >
                      <DownloadSimple size={16} weight="bold" aria-hidden="true" />
                      <span>
                        {isDownloading
                          ? `Mengunduh (${localAiProgress}%)...`
                          : isSelectedWebLlmCached
                          ? "Muat dari Cache & Aktifkan"
                          : "Unduh & Aktifkan Model"}
                      </span>
                    </Button>

                    {isReady ? (
                      <Button type="button" variant="secondary" onClick={handleUnloadAll}>
                        Nonaktifkan AI (Pakai Mode Standar)
                      </Button>
                    ) : null}

                    {isSelectedWebLlmCached ? (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleDeleteCache(webLlmModelId)}
                        className="gap-1.5"
                      >
                        <Trash size={15} weight="duotone" aria-hidden="true" />
                        <span>Hapus Cache Model Ini</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3.5 rounded-xl border border-[#D9CEBC] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#251813]">Pilih jenis server lokal di PC:</span>
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
                        Ollama (Port 11434)
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
                        LM Studio (Port 1234)
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 items-start">
                    <Field
                      label="Alamat server lokal"
                      hint="Berjalan langsung dari browser ke PC kamu tanpa melewati server luar."
                    >
                      <TextInput
                        value={localServerUrl}
                        onChange={(event) => setLocalAiConfig({ localServerUrl: event.target.value })}
                        placeholder={
                          serverKind === "ollama" ? "http://localhost:11434" : "http://localhost:1234"
                        }
                      />
                    </Field>

                    {discoveredModels.length > 0 ? (
                      <Field
                        label="Pilih model yang terpasang"
                        hint={`Ditemukan ${discoveredModels.length} model di ${
                          serverKind === "ollama" ? "Ollama" : "LM Studio"
                        }.`}
                      >
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
                      <Field
                        label="Nama model"
                        hint="Klik Ambil Daftar Model atau isi nama model (misal qwen2.5:3b)."
                      >
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
                      disabled={serverChecking}
                      onClick={handleFetchServerModels}
                      className="gap-1.5"
                    >
                      <ArrowsClockwise size={15} weight="bold" aria-hidden="true" />
                      <span>{serverChecking ? "Mengecek..." : "Ambil Daftar Model di PC"}</span>
                    </Button>

                    <Button
                      type="button"
                      disabled={serverChecking || !localServerModel.trim()}
                      onClick={handleActivateServer}
                      className="gap-1.5"
                    >
                      <PlugsConnected size={16} weight="duotone" aria-hidden="true" />
                      <span>Sambungkan & Aktifkan</span>
                    </Button>

                    {isReady ? (
                      <Button type="button" variant="ghost" onClick={handleUnloadAll}>
                        Putuskan Sambungan
                      </Button>
                    ) : null}
                  </div>

                  <p className="text-[11px] text-[#59483F] leading-relaxed">
                    Tips jika gagal tersambung dari web Vercel (HTTPS): di Ollama jalankan dengan env{" "}
                    <code className="rounded bg-[#FAF5E8] px-1 py-0.5 font-mono text-[#251813]">
                      OLLAMA_ORIGINS=*
                    </code>{" "}
                    atau nyalakan opsi <span className="font-bold">Enable CORS</span> pada Local Server LM Studio.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

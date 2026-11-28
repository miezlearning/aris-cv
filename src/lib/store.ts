import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import type {
  CertificationItem,
  CvLanguage,
  CvTemplate,
  Education,
  ExperienceLevel,
  JobTarget,
  MatchAnalytics,
  OrganizationItem,
  ProjectItem,
  ResumeProfile,
  RewriteSuggestion,
  SkillGroup,
  WorkExperience
} from "@/types/resume";
import { emptyAnalytics, emptyJobTarget, emptyResumeProfile, createId } from "@/lib/defaults";
import { analyzeMatch } from "@/lib/ats/scorer";
import {
  moveItemById,
  sortCertificationsDesc,
  sortEducationDesc,
  sortOrganizationsDesc,
  sortProjectsDesc,
  sortWorkExperienceDesc
} from "@/lib/chronology";
import {
  applyTranslatedFieldEdit,
  computeProfileContentHash,
  translateProfileDeterministic,
  type TranslatedFieldPath
} from "@/lib/ats/translator";
import { normalizeForMatch } from "@/lib/ats/synonyms";
import {
  DEFAULT_WEBLLM_MODEL_ID,
  type LocalAiProvider,
  type RestApiFormat,
  type RestApiPresetId
} from "@/lib/local-ai/models";
import { readSessionApiKey, saveSessionApiKey } from "@/lib/local-ai/engine";
import {
  applyRedo,
  applyUndo,
  pushHistorySnapshot,
  type HistorySnapshot
} from "@/lib/history";

export type MasterTab =
  | "contact"
  | "summary"
  | "education"
  | "projects"
  | "experience"
  | "organizations"
  | "certifications"
  | "skills";

const VALID_TABS: MasterTab[] = [
  "contact",
  "summary",
  "education",
  "projects",
  "experience",
  "organizations",
  "certifications",
  "skills"
];

const VALID_TEMPLATES: CvTemplate[] = ["compact_centered", "classic_editorial", "executive_left"];
const VALID_LOCAL_AI_MODES: LocalAiProvider[] = ["off", "webllm", "rest_api", "ollama", "lmstudio"];
const VALID_REST_API_FORMATS: RestApiFormat[] = ["openai", "gemini", "get_query"];
const VALID_REST_API_PRESETS: RestApiPresetId[] = ["gemini", "openrouter", "groq", "openai", "custom", "custom_get"];

export type CachedAiTranslation = {
  profile: ResumeProfile;
  sourceHash: string;
  providerLabel: string;
};

export type PreTranslationBackup = {
  profile: ResumeProfile;
  savedAt: string;
  targetLang: "id" | "en";
};

type AppState = {
  resumeProfile: ResumeProfile;
  jobTarget: JobTarget;
  matchAnalytics: MatchAnalytics;
  suggestions: RewriteSuggestion[];
  activeMasterTab: MasterTab;
  setActiveMasterTab: (tab: MasterTab) => void;
  cvLanguage: CvLanguage;
  setCvLanguage: (lang: CvLanguage) => void;
  cvTemplate: CvTemplate;
  setCvTemplate: (template: CvTemplate) => void;
  autoTranslateContent: boolean;
  setAutoTranslateContent: (enabled: boolean) => void;
  aiTranslatedProfiles: Partial<Record<"id" | "en", CachedAiTranslation>>;
  setAiTranslatedProfile: (
    lang: "id" | "en",
    profile: ResumeProfile | null,
    sourceHash: string,
    providerLabel?: string
  ) => void;
  applyTranslationToEditor: (lang: "id" | "en") => void;
  updateTranslatedField: (lang: "id" | "en", path: TranslatedFieldPath, value: string) => void;
  preTranslationBackup: PreTranslationBackup | null;
  restorePreTranslationBackup: () => void;
  addedGapTerms: string[];
  aiEnabled: boolean;
  localAiMode: LocalAiProvider;
  webLlmModelId: string;
  localServerUrl: string;
  localServerModel: string;
  restApiPreset: RestApiPresetId;
  restApiFormat: RestApiFormat;
  restApiUrl: string;
  restApiModel: string;
  restApiKey: string;
  setLocalAiConfig: (
    patch: Partial<{
      aiEnabled: boolean;
      localAiMode: LocalAiProvider;
      webLlmModelId: string;
      localServerUrl: string;
      localServerModel: string;
      restApiPreset: RestApiPresetId;
      restApiFormat: RestApiFormat;
      restApiUrl: string;
      restApiModel: string;
      restApiKey: string;
    }>
  ) => void;
  localAiStatus: "idle" | "downloading" | "ready" | "error";
  localAiProgress: number;
  localAiProgressText: string;
  localAiLoadedModel: string;
  localAiError: string;
  setLocalAiRuntime: (
    patch: Partial<{
      localAiStatus: "idle" | "downloading" | "ready" | "error";
      localAiProgress: number;
      localAiProgressText: string;
      localAiLoadedModel: string;
      localAiError: string;
    }>
  ) => void;
  checkedAdminItems: Record<string, boolean>;
  toggleAdminItem: (id: string) => void;
  previewOpenDesktop: boolean;
  setPreviewOpenDesktop: (open: boolean | ((prev: boolean) => boolean)) => void;
  modalPreviewOpen: boolean;
  setModalPreviewOpen: (open: boolean) => void;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;
  updateContact: (field: keyof ResumeProfile["contact"], value: string) => void;
  updateSummary: (value: string) => void;
  addExperience: () => void;
  updateExperience: (id: string, patch: Partial<WorkExperience>) => void;
  removeExperience: (id: string) => void;
  moveExperience: (id: string, direction: "up" | "down") => void;
  sortExperiencesChronologically: () => void;
  updateBullet: (experienceId: string, index: number, value: string) => void;
  addBullet: (experienceId: string) => void;
  removeBullet: (experienceId: string, index: number) => void;
  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  moveEducation: (id: string, direction: "up" | "down") => void;
  sortEducationChronologically: () => void;
  addProject: () => void;
  updateProject: (id: string, patch: Partial<ProjectItem>) => void;
  removeProject: (id: string) => void;
  moveProject: (id: string, direction: "up" | "down") => void;
  sortProjectsChronologically: () => void;
  addProjectBullet: (projectId: string) => void;
  updateProjectBullet: (projectId: string, index: number, value: string) => void;
  removeProjectBullet: (projectId: string, index: number) => void;
  addOrganization: () => void;
  updateOrganization: (id: string, patch: Partial<OrganizationItem>) => void;
  removeOrganization: (id: string) => void;
  moveOrganization: (id: string, direction: "up" | "down") => void;
  sortOrganizationsChronologically: () => void;
  addOrganizationBullet: (orgId: string) => void;
  updateOrganizationBullet: (orgId: string, index: number, value: string) => void;
  removeOrganizationBullet: (orgId: string, index: number) => void;
  addCertification: () => void;
  updateCertification: (id: string, patch: Partial<CertificationItem>) => void;
  removeCertification: (id: string) => void;
  moveCertification: (id: string, direction: "up" | "down") => void;
  sortCertificationsChronologically: () => void;
  updateSkills: (field: keyof ResumeProfile["skills"], values: string[]) => void;
  addSkillGroup: () => void;
  updateSkillGroup: (id: string, patch: Partial<SkillGroup>) => void;
  removeSkillGroup: (id: string) => void;
  setSkillGroups: (groups: SkillGroup[]) => void;
  addSkillItem: (field: "hardSkills" | "softSkills" | "tools", skill: string) => void;
  removeSkillItem: (skill: string) => void;
  toggleSkillItem: (field: "hardSkills" | "softSkills" | "tools", skill: string) => boolean;
  setResumeProfile: (profile: ResumeProfile) => void;
  updateJobTarget: (patch: Partial<JobTarget>) => void;
  setAnalytics: (analytics: MatchAnalytics) => void;
  setSuggestions: (suggestions: RewriteSuggestion[]) => void;
  updateSuggestion: (id: string, patch: Partial<RewriteSuggestion>) => void;
  applySuggestion: (id: string, value?: string) => void;
  rejectSuggestion: (id: string) => void;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  undoToast: { id: number; label: string } | null;
  dismissUndoToast: () => void;
  undoResume: () => void;
  redoResume: () => void;
  applyOptimizedBullet: (
    sourceType: "work" | "project" | "organization",
    sourceId: string,
    bulletIndex: number,
    value: string,
    label?: string
  ) => void;
  applyOptimizedSummary: (value: string, label?: string) => void;
  resetAll: () => void;
};

const indexedDbStorage: StateStorage = {
  getItem: async (name) => {
    if (typeof window === "undefined") return null;
    try {
      const value = await get<string>(name);
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    if (typeof window === "undefined") return;
    try {
      await set(name, value);
    } catch {
      // Abaikan kegagalan storage pada mode private browser
    }
  },
  removeItem: async (name) => {
    if (typeof window === "undefined") return;
    try {
      await del(name);
    } catch {
      // Abaikan kegagalan storage
    }
  }
};

const isBlankOrphanExperience = (item: Partial<WorkExperience>) =>
  !item.company?.trim() &&
  !item.role?.trim() &&
  !item.startDate?.trim() &&
  !(item.bulletPoints ?? []).some((bullet) => bullet?.trim()) &&
  (!item.endDate?.trim() || item.endDate.trim().toLowerCase() === "present");

const migrateLegacyProfile = (raw?: Partial<ResumeProfile>): ResumeProfile => {
  const base = emptyResumeProfile();
  if (!raw || typeof raw !== "object") return base;

  const workExperience = Array.isArray(raw.workExperience)
    ? raw.workExperience
        .filter((item) => !isBlankOrphanExperience(item))
        .map((item, idx) => ({
          id: item.id || `exp-${idx + 1}`,
          company: item.company ?? "",
          role: item.role ?? "",
          type: item.type,
          location: item.location ?? "",
          startDate: item.startDate ?? "",
          endDate: item.endDate ?? "",
          isCurrent: Boolean(item.isCurrent),
          bulletPoints: Array.isArray(item.bulletPoints) && item.bulletPoints.length ? item.bulletPoints : [""]
        }))
    : [];

  const education =
    Array.isArray(raw.education) && raw.education.length
      ? raw.education.map((item, idx) => ({
          id: item.id || `edu-${idx + 1}`,
          institution: item.institution ?? "",
          degree: item.degree ?? "",
          fieldOfStudy: item.fieldOfStudy ?? "",
          gpa: item.gpa ?? "",
          graduationDate: item.graduationDate ?? "",
          thesisTitle: item.thesisTitle ?? "",
          relevantCoursework: Array.isArray(item.relevantCoursework) ? item.relevantCoursework : [],
          achievements: item.achievements ?? ""
        }))
      : base.education;

  const projects: ProjectItem[] = Array.isArray(raw.projects)
    ? raw.projects.map((item, idx) => ({
        id: item.id || `proj-${idx + 1}`,
        name: item.name ?? "",
        role: item.role ?? "",
        context: item.context ?? "",
        period: item.period ?? "",
        technologies: Array.isArray(item.technologies) ? item.technologies : [],
        url: item.url ?? "",
        bulletPoints: Array.isArray(item.bulletPoints) && item.bulletPoints.length ? item.bulletPoints : [""]
      }))
    : [];

  const organizations: OrganizationItem[] = Array.isArray(raw.organizations)
    ? raw.organizations.map((item, idx) => ({
        id: item.id || `org-${idx + 1}`,
        organization: item.organization ?? "",
        role: item.role ?? "",
        period: item.period ?? "",
        bulletPoints: Array.isArray(item.bulletPoints) && item.bulletPoints.length ? item.bulletPoints : [""]
      }))
    : [];

  let certificationItems: CertificationItem[] = Array.isArray(raw.certificationItems) ? raw.certificationItems : [];
  if (!certificationItems.length && Array.isArray(raw.certifications) && raw.certifications.length) {
    certificationItems = raw.certifications
      .flatMap((line) => line.split(";"))
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name, idx) => ({ id: `cert-migrated-${idx + 1}`, name, issuer: "", year: "" }));
  }

  const experienceLevel: ExperienceLevel =
    raw.experienceLevel === "fresh_graduate" ||
    raw.experienceLevel === "early_career" ||
    raw.experienceLevel === "experienced"
      ? raw.experienceLevel
      : workExperience.length >= 2
      ? "experienced"
      : "fresh_graduate";

  return {
    experienceLevel,
    contact: { ...base.contact, ...(raw.contact ?? {}) },
    summary: raw.summary ?? "",
    workExperience,
    education,
    projects,
    organizations,
    certificationItems,
    skills: {
      hardSkills: Array.isArray(raw.skills?.hardSkills) ? raw.skills.hardSkills : [],
      softSkills: Array.isArray(raw.skills?.softSkills) ? raw.skills.softSkills : [],
      tools: Array.isArray(raw.skills?.tools) ? raw.skills.tools : [],
      groups: Array.isArray(raw.skills?.groups)
        ? raw.skills.groups.map((grp, idx) => ({
            id: grp.id || `skill-grp-${idx + 1}`,
            category: grp.category ?? "",
            items: Array.isArray(grp.items) ? grp.items : []
          }))
        : []
    },
    certifications: []
  };
};

export const useCvStore = create<AppState>()(
  persist(
    (set, getState) => {
      const commitResumeChange = (
        label: string,
        updater: (current: ResumeProfile) => ResumeProfile,
        options?: { coalesceKey?: string; showToast?: boolean; extraPatch?: Partial<AppState> }
      ) => {
        set((state) => {
          const nextProfile = updater(state.resumeProfile);
          const nextHistory = pushHistorySnapshot(
            { past: state.historyPast, future: state.historyFuture },
            state.resumeProfile,
            { label, coalesceKey: options?.coalesceKey }
          );
          return {
            ...(options?.extraPatch ?? {}),
            resumeProfile: nextProfile,
            historyPast: nextHistory.past,
            historyFuture: nextHistory.future,
            ...(options?.showToast ? { undoToast: { id: Date.now(), label } } : {})
          };
        });
      };

      return {
      resumeProfile: emptyResumeProfile(),
      historyPast: [],
      historyFuture: [],
      undoToast: null,
      dismissUndoToast: () => set({ undoToast: null }),
      undoResume: () => {
        const state = getState();
        const result = applyUndo(
          { past: state.historyPast, future: state.historyFuture },
          state.resumeProfile
        );
        if (!result) return;
        const nextAnalytics =
          state.matchAnalytics.hasAnalyzed && state.jobTarget.rawDescription.trim()
            ? analyzeMatch(result.nextProfile, state.jobTarget)
            : state.matchAnalytics;
        set({
          resumeProfile: result.nextProfile,
          historyPast: result.nextHistory.past,
          historyFuture: result.nextHistory.future,
          undoToast: null,
          matchAnalytics: nextAnalytics
        });
      },
      redoResume: () => {
        const state = getState();
        const result = applyRedo(
          { past: state.historyPast, future: state.historyFuture },
          state.resumeProfile
        );
        if (!result) return;
        const nextAnalytics =
          state.matchAnalytics.hasAnalyzed && state.jobTarget.rawDescription.trim()
            ? analyzeMatch(result.nextProfile, state.jobTarget)
            : state.matchAnalytics;
        set({
          resumeProfile: result.nextProfile,
          historyPast: result.nextHistory.past,
          historyFuture: result.nextHistory.future,
          undoToast: null,
          matchAnalytics: nextAnalytics
        });
      },
      jobTarget: emptyJobTarget(),
      matchAnalytics: emptyAnalytics(),
      suggestions: [],
      activeMasterTab: "contact",
      setActiveMasterTab: (tab) => set({ activeMasterTab: tab }),
      cvLanguage: "auto",
      setCvLanguage: (lang) => set({ cvLanguage: lang }),
      cvTemplate: "compact_centered",
      setCvTemplate: (template) => set({ cvTemplate: template }),
      autoTranslateContent: true,
      setAutoTranslateContent: (enabled) => set({ autoTranslateContent: enabled }),
      aiTranslatedProfiles: {},
      preTranslationBackup: null,
      addedGapTerms: [],
      setAiTranslatedProfile: (lang, profile, sourceHash, providerLabel = "AI Lokal") =>
        set((state) => {
          const next = { ...state.aiTranslatedProfiles };
          if (!profile) {
            delete next[lang];
          } else {
            next[lang] = { profile, sourceHash, providerLabel };
          }
          return { aiTranslatedProfiles: next };
        }),
      updateTranslatedField: (lang, path, value) => {
        const state = getState();
        const currentHash = computeProfileContentHash(state.resumeProfile);
        const cached = state.aiTranslatedProfiles[lang];
        const baseProfile =
          cached && cached.sourceHash === currentHash
            ? cached.profile
            : translateProfileDeterministic(state.resumeProfile, lang);
        const updated = applyTranslatedFieldEdit(baseProfile, path, value);
        set((curr) => ({
          aiTranslatedProfiles: {
            ...curr.aiTranslatedProfiles,
            [lang]: {
              profile: updated,
              sourceHash: currentHash,
              providerLabel: cached?.providerLabel ?? "Suntingan Manual"
            }
          }
        }));
      },
      applyTranslationToEditor: (lang) => {
        const state = getState();
        const currentHash = computeProfileContentHash(state.resumeProfile);
        const cached = state.aiTranslatedProfiles[lang];
        const nextProfile =
          cached && cached.sourceHash === currentHash
            ? {
                ...cached.profile,
                contact: {
                  ...state.resumeProfile.contact,
                  headline: cached.profile.contact.headline
                }
              }
            : translateProfileDeterministic(state.resumeProfile, lang);
        const backup = state.preTranslationBackup ?? {
          profile: state.resumeProfile,
          savedAt: new Date().toISOString(),
          targetLang: lang
        };
        commitResumeChange("Salin terjemahan ke editor", () => nextProfile, {
          showToast: true,
          extraPatch: {
            preTranslationBackup: backup,
            cvLanguage: lang,
            aiTranslatedProfiles: {}
          }
        });
      },
      restorePreTranslationBackup: () => {
        const backup = getState().preTranslationBackup;
        if (!backup) return;
        commitResumeChange("Kembalikan teks asli terjemahan", () => backup.profile, {
          showToast: true,
          extraPatch: {
            preTranslationBackup: null,
            aiTranslatedProfiles: {},
            cvLanguage: "auto"
          }
        });
      },
      aiEnabled: false,
      localAiMode: "off",
      webLlmModelId: DEFAULT_WEBLLM_MODEL_ID,
      localServerUrl: "http://localhost:11434",
      localServerModel: "",
      restApiPreset: "gemini",
      restApiFormat: "gemini",
      restApiUrl: "https://generativelanguage.googleapis.com/v1beta",
      restApiModel: "gemini-2.5-flash",
      restApiKey: "",
      setLocalAiConfig: (patch) => {
        if (typeof patch.restApiKey === "string") {
          saveSessionApiKey(patch.restApiKey);
        }
        set((state) => ({ ...state, ...patch }));
      },
      localAiStatus: "idle",
      localAiProgress: 0,
      localAiProgressText: "",
      localAiLoadedModel: "",
      localAiError: "",
      setLocalAiRuntime: (patch) => set((state) => ({ ...state, ...patch })),
      checkedAdminItems: {},
      toggleAdminItem: (id) =>
        set((state) => ({
          checkedAdminItems: {
            ...state.checkedAdminItems,
            [id]: !state.checkedAdminItems[id]
          }
        })),
      previewOpenDesktop: true,
      setPreviewOpenDesktop: (open) =>
        set((state) => ({
          previewOpenDesktop: typeof open === "function" ? open(state.previewOpenDesktop) : open
        })),
      modalPreviewOpen: false,
      setModalPreviewOpen: (open) => set({ modalPreviewOpen: open }),
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setExperienceLevel: (level) =>
        commitResumeChange("Ubah tingkat pengalaman", (curr) => ({ ...curr, experienceLevel: level })),
      updateContact: (field, value) =>
        commitResumeChange(
          "Ubah profil & kontak",
          (curr) => ({
            ...curr,
            contact: { ...curr.contact, [field]: value }
          }),
          { coalesceKey: `contact-${field}` }
        ),
      updateSummary: (value) =>
        commitResumeChange(
          "Ubah ringkasan profil",
          (curr) => ({ ...curr, summary: value }),
          { coalesceKey: "summary" }
        ),
      addExperience: () =>
        commitResumeChange("Tambah pengalaman", (curr) => ({
          ...curr,
          workExperience: [
            ...curr.workExperience,
            {
              id: createId(),
              company: "",
              role: "",
              type: curr.experienceLevel === "fresh_graduate" ? "internship" : "fulltime",
              location: "",
              startDate: "",
              endDate: "",
              isCurrent: false,
              bulletPoints: [""]
            }
          ]
        })),
      updateExperience: (id, patch) =>
        commitResumeChange(
          "Ubah detail pengalaman",
          (curr) => ({
            ...curr,
            workExperience: curr.workExperience.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            )
          }),
          { coalesceKey: `work-${id}-${Object.keys(patch).sort().join(",")}` }
        ),
      removeExperience: (id) =>
        commitResumeChange(
          "Hapus pengalaman",
          (curr) => ({
            ...curr,
            workExperience: curr.workExperience.filter((item) => item.id !== id)
          }),
          { showToast: true }
        ),
      moveExperience: (id, direction) =>
        commitResumeChange("Ubah urutan pengalaman", (curr) => ({
          ...curr,
          workExperience: moveItemById(curr.workExperience, id, direction)
        })),
      sortExperiencesChronologically: () =>
        commitResumeChange(
          "Urutkan pengalaman terbaru",
          (curr) => ({
            ...curr,
            workExperience: sortWorkExperienceDesc(curr.workExperience)
          }),
          { showToast: true }
        ),
      updateBullet: (experienceId, index, value) =>
        commitResumeChange(
          "Ubah poin pengalaman",
          (curr) => ({
            ...curr,
            workExperience: curr.workExperience.map((item) => {
              if (item.id !== experienceId) return item;
              const bulletPoints = [...item.bulletPoints];
              bulletPoints[index] = value;
              return { ...item, bulletPoints };
            })
          }),
          { coalesceKey: `work-bullet-${experienceId}-${index}` }
        ),
      addBullet: (experienceId) =>
        commitResumeChange("Tambah poin pengalaman", (curr) => ({
          ...curr,
          workExperience: curr.workExperience.map((item) =>
            item.id === experienceId ? { ...item, bulletPoints: [...item.bulletPoints, ""] } : item
          )
        })),
      removeBullet: (experienceId, index) =>
        commitResumeChange(
          "Hapus poin pengalaman",
          (curr) => ({
            ...curr,
            workExperience: curr.workExperience.map((item) => {
              if (item.id !== experienceId) return item;
              const bulletPoints = item.bulletPoints.filter((_, bulletIndex) => bulletIndex !== index);
              return { ...item, bulletPoints: bulletPoints.length ? bulletPoints : [""] };
            })
          }),
          { showToast: true }
        ),
      addEducation: () =>
        commitResumeChange("Tambah pendidikan", (curr) => ({
          ...curr,
          education: [
            ...curr.education,
            {
              id: createId(),
              institution: "",
              degree: "",
              fieldOfStudy: "",
              gpa: "",
              graduationDate: "",
              thesisTitle: "",
              relevantCoursework: [],
              achievements: ""
            }
          ]
        })),
      updateEducation: (id, patch) =>
        commitResumeChange(
          "Ubah detail pendidikan",
          (curr) => ({
            ...curr,
            education: curr.education.map((item) => (item.id === id ? { ...item, ...patch } : item))
          }),
          { coalesceKey: `edu-${id}-${Object.keys(patch).sort().join(",")}` }
        ),
      removeEducation: (id) =>
        commitResumeChange(
          "Hapus pendidikan",
          (curr) => ({
            ...curr,
            education: curr.education.filter((item) => item.id !== id)
          }),
          { showToast: true }
        ),
      moveEducation: (id, direction) =>
        commitResumeChange("Ubah urutan pendidikan", (curr) => ({
          ...curr,
          education: moveItemById(curr.education, id, direction)
        })),
      sortEducationChronologically: () =>
        commitResumeChange(
          "Urutkan pendidikan terbaru",
          (curr) => ({
            ...curr,
            education: sortEducationDesc(curr.education)
          }),
          { showToast: true }
        ),
      addProject: () =>
        commitResumeChange("Tambah proyek", (curr) => ({
          ...curr,
          projects: [
            ...curr.projects,
            {
              id: createId(),
              name: "",
              role: "",
              context: "Proyek Kuliah",
              period: "",
              technologies: [],
              url: "",
              bulletPoints: [""]
            }
          ]
        })),
      updateProject: (id, patch) =>
        commitResumeChange(
          "Ubah detail proyek",
          (curr) => ({
            ...curr,
            projects: curr.projects.map((item) => (item.id === id ? { ...item, ...patch } : item))
          }),
          { coalesceKey: `proj-${id}-${Object.keys(patch).sort().join(",")}` }
        ),
      removeProject: (id) =>
        commitResumeChange(
          "Hapus proyek",
          (curr) => ({
            ...curr,
            projects: curr.projects.filter((item) => item.id !== id)
          }),
          { showToast: true }
        ),
      moveProject: (id, direction) =>
        commitResumeChange("Ubah urutan proyek", (curr) => ({
          ...curr,
          projects: moveItemById(curr.projects, id, direction)
        })),
      sortProjectsChronologically: () =>
        commitResumeChange(
          "Urutkan proyek terbaru",
          (curr) => ({
            ...curr,
            projects: sortProjectsDesc(curr.projects)
          }),
          { showToast: true }
        ),
      addProjectBullet: (projectId) =>
        commitResumeChange("Tambah poin proyek", (curr) => ({
          ...curr,
          projects: curr.projects.map((item) =>
            item.id === projectId ? { ...item, bulletPoints: [...item.bulletPoints, ""] } : item
          )
        })),
      updateProjectBullet: (projectId, index, value) =>
        commitResumeChange(
          "Ubah poin proyek",
          (curr) => ({
            ...curr,
            projects: curr.projects.map((item) => {
              if (item.id !== projectId) return item;
              const bulletPoints = [...item.bulletPoints];
              bulletPoints[index] = value;
              return { ...item, bulletPoints };
            })
          }),
          { coalesceKey: `proj-bullet-${projectId}-${index}` }
        ),
      removeProjectBullet: (projectId, index) =>
        commitResumeChange(
          "Hapus poin proyek",
          (curr) => ({
            ...curr,
            projects: curr.projects.map((item) => {
              if (item.id !== projectId) return item;
              const bulletPoints = item.bulletPoints.filter((_, idx) => idx !== index);
              return { ...item, bulletPoints: bulletPoints.length ? bulletPoints : [""] };
            })
          }),
          { showToast: true }
        ),
      addOrganization: () =>
        commitResumeChange("Tambah organisasi", (curr) => ({
          ...curr,
          organizations: [
            ...curr.organizations,
            {
              id: createId(),
              organization: "",
              role: "",
              period: "",
              bulletPoints: [""]
            }
          ]
        })),
      updateOrganization: (id, patch) =>
        commitResumeChange(
          "Ubah detail organisasi",
          (curr) => ({
            ...curr,
            organizations: curr.organizations.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            )
          }),
          { coalesceKey: `org-${id}-${Object.keys(patch).sort().join(",")}` }
        ),
      removeOrganization: (id) =>
        commitResumeChange(
          "Hapus organisasi",
          (curr) => ({
            ...curr,
            organizations: curr.organizations.filter((item) => item.id !== id)
          }),
          { showToast: true }
        ),
      moveOrganization: (id, direction) =>
        commitResumeChange("Ubah urutan organisasi", (curr) => ({
          ...curr,
          organizations: moveItemById(curr.organizations, id, direction)
        })),
      sortOrganizationsChronologically: () =>
        commitResumeChange(
          "Urutkan organisasi terbaru",
          (curr) => ({
            ...curr,
            organizations: sortOrganizationsDesc(curr.organizations)
          }),
          { showToast: true }
        ),
      addOrganizationBullet: (orgId) =>
        commitResumeChange("Tambah poin organisasi", (curr) => ({
          ...curr,
          organizations: curr.organizations.map((item) =>
            item.id === orgId ? { ...item, bulletPoints: [...item.bulletPoints, ""] } : item
          )
        })),
      updateOrganizationBullet: (orgId, index, value) =>
        commitResumeChange(
          "Ubah poin organisasi",
          (curr) => ({
            ...curr,
            organizations: curr.organizations.map((item) => {
              if (item.id !== orgId) return item;
              const bulletPoints = [...item.bulletPoints];
              bulletPoints[index] = value;
              return { ...item, bulletPoints };
            })
          }),
          { coalesceKey: `org-bullet-${orgId}-${index}` }
        ),
      removeOrganizationBullet: (orgId, index) =>
        commitResumeChange(
          "Hapus poin organisasi",
          (curr) => ({
            ...curr,
            organizations: curr.organizations.map((item) => {
              if (item.id !== orgId) return item;
              const bulletPoints = item.bulletPoints.filter((_, idx) => idx !== index);
              return { ...item, bulletPoints: bulletPoints.length ? bulletPoints : [""] };
            })
          }),
          { showToast: true }
        ),
      addCertification: () =>
        commitResumeChange("Tambah sertifikasi", (curr) => ({
          ...curr,
          certificationItems: [
            ...curr.certificationItems,
            { id: createId(), name: "", issuer: "", year: "" }
          ]
        })),
      updateCertification: (id, patch) =>
        commitResumeChange(
          "Ubah detail sertifikasi",
          (curr) => ({
            ...curr,
            certificationItems: curr.certificationItems.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            )
          }),
          { coalesceKey: `cert-${id}-${Object.keys(patch).sort().join(",")}` }
        ),
      removeCertification: (id) =>
        commitResumeChange(
          "Hapus sertifikasi",
          (curr) => ({
            ...curr,
            certificationItems: curr.certificationItems.filter((item) => item.id !== id)
          }),
          { showToast: true }
        ),
      moveCertification: (id, direction) =>
        commitResumeChange("Ubah urutan sertifikasi", (curr) => ({
          ...curr,
          certificationItems: moveItemById(curr.certificationItems, id, direction)
        })),
      sortCertificationsChronologically: () =>
        commitResumeChange(
          "Urutkan sertifikasi terbaru",
          (curr) => ({
            ...curr,
            certificationItems: sortCertificationsDesc(curr.certificationItems)
          }),
          { showToast: true }
        ),
      updateSkills: (field, values) =>
        commitResumeChange(
          "Ubah daftar keahlian",
          (curr) => ({
            ...curr,
            skills: { ...curr.skills, [field]: values }
          }),
          { coalesceKey: `skills-${field}` }
        ),
      addSkillGroup: () =>
        commitResumeChange("Tambah kategori keahlian", (curr) => ({
          ...curr,
          skills: {
            ...curr.skills,
            groups: [
              ...(curr.skills.groups ?? []),
              { id: createId(), category: "", items: [] }
            ]
          }
        })),
      updateSkillGroup: (id, patch) =>
        commitResumeChange(
          "Ubah kategori keahlian",
          (curr) => ({
            ...curr,
            skills: {
              ...curr.skills,
              groups: (curr.skills.groups ?? []).map((grp) =>
                grp.id === id ? { ...grp, ...patch } : grp
              )
            }
          }),
          { coalesceKey: `skill-grp-${id}-${Object.keys(patch).sort().join(",")}` }
        ),
      removeSkillGroup: (id) =>
        commitResumeChange(
          "Hapus kategori keahlian",
          (curr) => ({
            ...curr,
            skills: {
              ...curr.skills,
              groups: (curr.skills.groups ?? []).filter((grp) => grp.id !== id)
            }
          }),
          { showToast: true }
        ),
      setSkillGroups: (groups) =>
        commitResumeChange("Ubah kelompok keahlian", (curr) => ({
          ...curr,
          skills: {
            ...curr.skills,
            groups
          }
        })),
      addSkillItem: (field, skill) => {
        const clean = skill.trim();
        if (!clean) return;
        const state = getState();
        const currentProfile = state.resumeProfile;
        const current = currentProfile.skills[field] ?? [];
        const normClean = normalizeForMatch(clean);
        const existsFlat = current.some((item) => normalizeForMatch(item) === normClean);

        const currentGroups = currentProfile.skills.groups ?? [];
        let nextGroups = currentGroups;
        if (currentGroups.length > 0) {
          const existsInGroups = currentGroups.some((grp) =>
            (grp.items ?? []).some((item) => normalizeForMatch(item) === normClean)
          );
          if (!existsInGroups) {
            const targetIdx =
              field === "tools"
                ? currentGroups.findIndex((g) => /tool|framework|librar|database|software|platform|alat/i.test(g.category))
                : field === "softSkills"
                ? currentGroups.findIndex((g) => /soft|interpersonal|bahasa|language|other|lainnya/i.test(g.category))
                : currentGroups.findIndex((g) => /other|lainnya|technical|programming|hard/i.test(g.category));
            const resolvedIdx = targetIdx >= 0 ? targetIdx : currentGroups.length - 1;
            nextGroups = currentGroups.map((grp, idx) =>
              idx === resolvedIdx ? { ...grp, items: [...grp.items, clean] } : grp
            );
          }
        }

        const nextGapTerms = state.addedGapTerms.some((t) => normalizeForMatch(t) === normClean)
          ? state.addedGapTerms
          : [...state.addedGapTerms, clean];

        commitResumeChange(
          "Tambah keahlian",
          (curr) => ({
            ...curr,
            skills: {
              ...curr.skills,
              [field]: existsFlat ? current : [...current, clean],
              groups: nextGroups
            }
          }),
          { extraPatch: { addedGapTerms: nextGapTerms } }
        );

        const { matchAnalytics, resumeProfile, jobTarget } = getState();
        if (matchAnalytics.hasAnalyzed && jobTarget.rawDescription.trim()) {
          set({ matchAnalytics: analyzeMatch(resumeProfile, jobTarget) });
        }
      },
      removeSkillItem: (skill) => {
        const normClean = normalizeForMatch(skill);
        if (!normClean) return;
        const state = getState();
        const filterOut = (arr: string[] | undefined) =>
          (arr ?? []).filter((item) => normalizeForMatch(item) !== normClean);

        commitResumeChange(
          "Hapus keahlian",
          (curr) => ({
            ...curr,
            skills: {
              ...curr.skills,
              hardSkills: filterOut(curr.skills.hardSkills),
              softSkills: filterOut(curr.skills.softSkills),
              tools: filterOut(curr.skills.tools),
              groups: (curr.skills.groups ?? []).map((grp) => ({
                ...grp,
                items: filterOut(grp.items)
              }))
            }
          }),
          {
            extraPatch: {
              addedGapTerms: state.addedGapTerms.filter((t) => normalizeForMatch(t) !== normClean)
            }
          }
        );

        const { matchAnalytics, jobTarget } = state;
        if (matchAnalytics.hasAnalyzed && jobTarget.rawDescription.trim()) {
          set({ matchAnalytics: analyzeMatch(getState().resumeProfile, jobTarget) });
        }
      },
      toggleSkillItem: (field, skill) => {
        const clean = skill.trim();
        const normClean = normalizeForMatch(clean);
        if (!normClean) return false;
        const { skills } = getState().resumeProfile;
        const allSkillStrings = [
          ...(skills.hardSkills ?? []),
          ...(skills.tools ?? []),
          ...(skills.softSkills ?? []),
          ...(skills.groups ?? []).flatMap((g) => g.items ?? [])
        ];
        const exists = allSkillStrings.some((item) => normalizeForMatch(item) === normClean);
        if (exists) {
          getState().removeSkillItem(clean);
          return false;
        }
        getState().addSkillItem(field, clean);
        return true;
      },
      setResumeProfile: (profile) => {
        const curr = getState().resumeProfile;
        const hasExistingContent = Boolean(
          curr.contact.fullName.trim() ||
            curr.summary.trim() ||
            curr.workExperience.length > 0 ||
            curr.projects.length > 0 ||
            curr.organizations.length > 0
        );
        commitResumeChange("Impor / ganti data CV", () => profile, {
          showToast: hasExistingContent,
          extraPatch: { preTranslationBackup: null, addedGapTerms: [], aiTranslatedProfiles: {} }
        });
      },
      updateJobTarget: (patch) =>
        set((state) => ({
          jobTarget: { ...state.jobTarget, ...patch }
        })),
      setAnalytics: (analytics) => set({ matchAnalytics: analytics }),
      setSuggestions: (suggestions) => set({ suggestions }),
      updateSuggestion: (id, patch) =>
        set((state) => ({
          suggestions: state.suggestions.map((item) => (item.id === id ? { ...item, ...patch } : item))
        })),
      applyOptimizedBullet: (sourceType, sourceId, bulletIndex, value, label = "Terapkan poin optimasi") => {
        commitResumeChange(
          label,
          (curr) => {
            if (sourceType === "project") {
              return {
                ...curr,
                projects: curr.projects.map((item) => {
                  if (item.id !== sourceId) return item;
                  const bulletPoints = [...item.bulletPoints];
                  bulletPoints[bulletIndex] = value;
                  return { ...item, bulletPoints };
                })
              };
            }
            if (sourceType === "organization") {
              return {
                ...curr,
                organizations: curr.organizations.map((item) => {
                  if (item.id !== sourceId) return item;
                  const bulletPoints = [...item.bulletPoints];
                  bulletPoints[bulletIndex] = value;
                  return { ...item, bulletPoints };
                })
              };
            }
            return {
              ...curr,
              workExperience: curr.workExperience.map((item) => {
                if (item.id !== sourceId) return item;
                const bulletPoints = [...item.bulletPoints];
                bulletPoints[bulletIndex] = value;
                return { ...item, bulletPoints };
              })
            };
          },
          { showToast: true }
        );
      },
      applyOptimizedSummary: (value, label = "Terapkan ringkasan AI") => {
        commitResumeChange(
          label,
          (curr) => ({ ...curr, summary: value }),
          { showToast: true }
        );
      },
      applySuggestion: (id, value) => {
        const suggestion = getState().suggestions.find((item) => item.id === id);
        if (!suggestion) return;
        const finalValue = value ?? suggestion.suggestion;
        const sourceId = suggestion.sourceId || suggestion.experienceId;

        getState().applyOptimizedBullet(
          suggestion.sourceType ?? "work",
          sourceId,
          suggestion.bulletIndex,
          finalValue,
          "Terapkan saran optimasi"
        );

        getState().updateSuggestion(id, {
          suggestion: finalValue,
          status: value ? "edited" : "accepted"
        });

        const { matchAnalytics, resumeProfile, jobTarget } = getState();
        if (matchAnalytics.hasAnalyzed && jobTarget.rawDescription.trim()) {
          set({ matchAnalytics: analyzeMatch(resumeProfile, jobTarget) });
        }
      },
      rejectSuggestion: (id) => getState().updateSuggestion(id, { status: "rejected" }),
      resetAll: () => {
        saveSessionApiKey("");
        const state = getState();
        const hadContent = Boolean(
          state.resumeProfile.contact.fullName.trim() ||
            state.resumeProfile.summary.trim() ||
            state.resumeProfile.workExperience.length > 0 ||
            state.resumeProfile.projects.length > 0 ||
            state.resumeProfile.organizations.length > 0
        );
        const nextHistory = hadContent
          ? pushHistorySnapshot(
              { past: state.historyPast, future: state.historyFuture },
              state.resumeProfile,
              { label: "Hapus semua data CV" }
            )
          : { past: state.historyPast, future: state.historyFuture };

        set({
          resumeProfile: emptyResumeProfile(),
          historyPast: nextHistory.past,
          historyFuture: nextHistory.future,
          undoToast: hadContent ? { id: Date.now(), label: "Hapus semua data CV" } : null,
          jobTarget: emptyJobTarget(),
          matchAnalytics: emptyAnalytics(),
          suggestions: [],
          aiTranslatedProfiles: {},
          preTranslationBackup: null,
          addedGapTerms: [],
          aiEnabled: false,
          localAiMode: "off",
          localAiStatus: "idle",
          localAiProgress: 0,
          localAiProgressText: "",
          localAiLoadedModel: "",
          localAiError: "",
          restApiKey: "",
          checkedAdminItems: {},
          activeMasterTab: "contact",
          previewOpenDesktop: true,
          modalPreviewOpen: false
        });
      }
      };
    },
    {
      name: "quicktailor-cv-store",
      storage: createJSONStorage(() => indexedDbStorage),
      partialize: (state) => ({
        resumeProfile: state.resumeProfile,
        jobTarget: state.jobTarget,
        matchAnalytics: state.matchAnalytics,
        suggestions: state.suggestions,
        activeMasterTab: state.activeMasterTab,
        cvLanguage: state.cvLanguage,
        cvTemplate: state.cvTemplate,
        autoTranslateContent: state.autoTranslateContent,
        aiTranslatedProfiles: state.aiTranslatedProfiles,
        preTranslationBackup: state.preTranslationBackup,
        addedGapTerms: state.addedGapTerms,
        aiEnabled: state.aiEnabled,
        localAiMode: state.localAiMode,
        webLlmModelId: state.webLlmModelId,
        localServerUrl: state.localServerUrl,
        localServerModel: state.localServerModel,
        restApiPreset: state.restApiPreset,
        restApiFormat: state.restApiFormat,
        restApiUrl: state.restApiUrl,
        restApiModel: state.restApiModel,
        checkedAdminItems: state.checkedAdminItems,
        previewOpenDesktop: state.previewOpenDesktop
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppState>;
        const resumeProfile = migrateLegacyProfile(persisted.resumeProfile);
        const baseAnalytics = emptyAnalytics();
        const rawAnalytics = persisted.matchAnalytics;
        const matchAnalytics: MatchAnalytics = rawAnalytics
          ? {
              ...baseAnalytics,
              ...rawAnalytics,
              hasAnalyzed: Boolean(rawAnalytics.hasAnalyzed || (rawAnalytics.keywordMatches?.length ?? 0) > 0),
              breakdown: {
                ...baseAnalytics.breakdown,
                ...(rawAnalytics.breakdown ?? {}),
                weights: {
                  ...baseAnalytics.breakdown.weights,
                  ...(rawAnalytics.breakdown?.weights ?? {})
                }
              },
              languageAlignment: rawAnalytics.languageAlignment ?? baseAnalytics.languageAlignment,
              qualificationMatches: Array.isArray(rawAnalytics.qualificationMatches)
                ? rawAnalytics.qualificationMatches
                : [],
              administrativeItems: Array.isArray(rawAnalytics.administrativeItems)
                ? rawAnalytics.administrativeItems
                : [],
              implicitSuggestions: Array.isArray(rawAnalytics.implicitSuggestions)
                ? rawAnalytics.implicitSuggestions
                : [],
              formatChecks: Array.isArray(rawAnalytics.formatChecks) ? rawAnalytics.formatChecks : []
            }
          : baseAnalytics;

        const suggestions: RewriteSuggestion[] = Array.isArray(persisted.suggestions)
          ? persisted.suggestions.map((item) => ({
              ...item,
              sourceType: item.sourceType ?? "work",
              sourceId: item.sourceId ?? item.experienceId,
              sourceLabel: item.sourceLabel ?? "Pengalaman Kerja"
            }))
          : [];

        const activeMasterTab: MasterTab = VALID_TABS.includes(persisted.activeMasterTab as MasterTab)
          ? (persisted.activeMasterTab as MasterTab)
          : "contact";

        const cvTemplate: CvTemplate = VALID_TEMPLATES.includes(persisted.cvTemplate as CvTemplate)
          ? (persisted.cvTemplate as CvTemplate)
          : "compact_centered";

        const localAiMode: LocalAiProvider = VALID_LOCAL_AI_MODES.includes(
          persisted.localAiMode as LocalAiProvider
        )
          ? (persisted.localAiMode as LocalAiProvider)
          : "off";

        const restApiPreset: RestApiPresetId = VALID_REST_API_PRESETS.includes(
          persisted.restApiPreset as RestApiPresetId
        )
          ? (persisted.restApiPreset as RestApiPresetId)
          : "gemini";
        const restApiFormat: RestApiFormat = VALID_REST_API_FORMATS.includes(
          persisted.restApiFormat as RestApiFormat
        )
          ? (persisted.restApiFormat as RestApiFormat)
          : "gemini";

        return {
          ...currentState,
          ...persisted,
          resumeProfile,
          matchAnalytics,
          suggestions,
          activeMasterTab,
          cvLanguage: persisted.cvLanguage ?? "auto",
          cvTemplate,
          autoTranslateContent: persisted.autoTranslateContent ?? true,
          aiTranslatedProfiles:
            persisted.aiTranslatedProfiles && typeof persisted.aiTranslatedProfiles === "object"
              ? persisted.aiTranslatedProfiles
              : {},
          preTranslationBackup: persisted.preTranslationBackup ?? null,
          addedGapTerms: Array.isArray(persisted.addedGapTerms) ? persisted.addedGapTerms : [],
          aiEnabled: Boolean(persisted.aiEnabled),
          localAiMode,
          webLlmModelId: persisted.webLlmModelId || DEFAULT_WEBLLM_MODEL_ID,
          localServerUrl: persisted.localServerUrl || "http://localhost:11434",
          localServerModel: persisted.localServerModel || "",
          restApiPreset,
          restApiFormat,
          restApiUrl:
            typeof persisted.restApiUrl === "string"
              ? persisted.restApiUrl
              : "https://generativelanguage.googleapis.com/v1beta",
          restApiModel:
            typeof persisted.restApiModel === "string" ? persisted.restApiModel : "gemini-2.5-flash",
          restApiKey: "",
          localAiStatus: "idle",
          localAiProgress: 0,
          localAiProgressText: "",
          localAiLoadedModel: "",
          localAiError: "",
          checkedAdminItems: persisted.checkedAdminItems ?? {},
          historyPast: [],
          historyFuture: [],
          undoToast: null
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const sessionKey = readSessionApiKey();
          if (sessionKey) state.setLocalAiConfig({ restApiKey: sessionKey });
          state.setHydrated(true);
        }
      }
    }
  )
);

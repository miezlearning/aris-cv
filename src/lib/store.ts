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
import { computeProfileContentHash, translateProfileDeterministic } from "@/lib/ats/translator";
import { normalizeForMatch } from "@/lib/ats/synonyms";
import {
  DEFAULT_WEBLLM_MODEL_ID,
  type LocalAiProvider,
  type RestApiFormat,
  type RestApiPresetId
} from "@/lib/local-ai/models";
import { readSessionApiKey, saveSessionApiKey } from "@/lib/local-ai/engine";

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

export type CachedAiTranslation = {
  profile: ResumeProfile;
  sourceHash: string;
  providerLabel: string;
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
  updateBullet: (experienceId: string, index: number, value: string) => void;
  addBullet: (experienceId: string) => void;
  removeBullet: (experienceId: string, index: number) => void;
  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  addProject: () => void;
  updateProject: (id: string, patch: Partial<ProjectItem>) => void;
  removeProject: (id: string) => void;
  addProjectBullet: (projectId: string) => void;
  updateProjectBullet: (projectId: string, index: number, value: string) => void;
  removeProjectBullet: (projectId: string, index: number) => void;
  addOrganization: () => void;
  updateOrganization: (id: string, patch: Partial<OrganizationItem>) => void;
  removeOrganization: (id: string) => void;
  addOrganizationBullet: (orgId: string) => void;
  updateOrganizationBullet: (orgId: string, index: number, value: string) => void;
  removeOrganizationBullet: (orgId: string, index: number) => void;
  addCertification: () => void;
  updateCertification: (id: string, patch: Partial<CertificationItem>) => void;
  removeCertification: (id: string) => void;
  updateSkills: (field: keyof ResumeProfile["skills"], values: string[]) => void;
  addSkillGroup: () => void;
  updateSkillGroup: (id: string, patch: Partial<SkillGroup>) => void;
  removeSkillGroup: (id: string) => void;
  setSkillGroups: (groups: SkillGroup[]) => void;
  addSkillItem: (field: "hardSkills" | "softSkills" | "tools", skill: string) => void;
  setResumeProfile: (profile: ResumeProfile) => void;
  updateJobTarget: (patch: Partial<JobTarget>) => void;
  setAnalytics: (analytics: MatchAnalytics) => void;
  setSuggestions: (suggestions: RewriteSuggestion[]) => void;
  updateSuggestion: (id: string, patch: Partial<RewriteSuggestion>) => void;
  applySuggestion: (id: string, value?: string) => void;
  rejectSuggestion: (id: string) => void;
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
    (set, getState) => ({
      resumeProfile: emptyResumeProfile(),
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
        set({
          resumeProfile: nextProfile,
          cvLanguage: lang,
          aiTranslatedProfiles: {}
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
        set((state) => ({
          resumeProfile: { ...state.resumeProfile, experienceLevel: level }
        })),
      updateContact: (field, value) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            contact: { ...state.resumeProfile.contact, [field]: value }
          }
        })),
      updateSummary: (value) =>
        set((state) => ({
          resumeProfile: { ...state.resumeProfile, summary: value }
        })),
      addExperience: () =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            workExperience: [
              ...state.resumeProfile.workExperience,
              {
                id: createId(),
                company: "",
                role: "",
                type: state.resumeProfile.experienceLevel === "fresh_graduate" ? "internship" : "fulltime",
                location: "",
                startDate: "",
                endDate: "",
                isCurrent: false,
                bulletPoints: [""]
              }
            ]
          }
        })),
      updateExperience: (id, patch) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            workExperience: state.resumeProfile.workExperience.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            )
          }
        })),
      removeExperience: (id) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            workExperience: state.resumeProfile.workExperience.filter((item) => item.id !== id)
          }
        })),
      updateBullet: (experienceId, index, value) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            workExperience: state.resumeProfile.workExperience.map((item) => {
              if (item.id !== experienceId) return item;
              const bulletPoints = [...item.bulletPoints];
              bulletPoints[index] = value;
              return { ...item, bulletPoints };
            })
          }
        })),
      addBullet: (experienceId) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            workExperience: state.resumeProfile.workExperience.map((item) =>
              item.id === experienceId ? { ...item, bulletPoints: [...item.bulletPoints, ""] } : item
            )
          }
        })),
      removeBullet: (experienceId, index) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            workExperience: state.resumeProfile.workExperience.map((item) => {
              if (item.id !== experienceId) return item;
              const bulletPoints = item.bulletPoints.filter((_, bulletIndex) => bulletIndex !== index);
              return { ...item, bulletPoints: bulletPoints.length ? bulletPoints : [""] };
            })
          }
        })),
      addEducation: () =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            education: [
              ...state.resumeProfile.education,
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
          }
        })),
      updateEducation: (id, patch) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            education: state.resumeProfile.education.map((item) => (item.id === id ? { ...item, ...patch } : item))
          }
        })),
      removeEducation: (id) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            education: state.resumeProfile.education.filter((item) => item.id !== id)
          }
        })),
      addProject: () =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            projects: [
              ...state.resumeProfile.projects,
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
          }
        })),
      updateProject: (id, patch) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            projects: state.resumeProfile.projects.map((item) => (item.id === id ? { ...item, ...patch } : item))
          }
        })),
      removeProject: (id) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            projects: state.resumeProfile.projects.filter((item) => item.id !== id)
          }
        })),
      addProjectBullet: (projectId) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            projects: state.resumeProfile.projects.map((item) =>
              item.id === projectId ? { ...item, bulletPoints: [...item.bulletPoints, ""] } : item
            )
          }
        })),
      updateProjectBullet: (projectId, index, value) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            projects: state.resumeProfile.projects.map((item) => {
              if (item.id !== projectId) return item;
              const bulletPoints = [...item.bulletPoints];
              bulletPoints[index] = value;
              return { ...item, bulletPoints };
            })
          }
        })),
      removeProjectBullet: (projectId, index) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            projects: state.resumeProfile.projects.map((item) => {
              if (item.id !== projectId) return item;
              const bulletPoints = item.bulletPoints.filter((_, idx) => idx !== index);
              return { ...item, bulletPoints: bulletPoints.length ? bulletPoints : [""] };
            })
          }
        })),
      addOrganization: () =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            organizations: [
              ...state.resumeProfile.organizations,
              {
                id: createId(),
                organization: "",
                role: "",
                period: "",
                bulletPoints: [""]
              }
            ]
          }
        })),
      updateOrganization: (id, patch) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            organizations: state.resumeProfile.organizations.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            )
          }
        })),
      removeOrganization: (id) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            organizations: state.resumeProfile.organizations.filter((item) => item.id !== id)
          }
        })),
      addOrganizationBullet: (orgId) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            organizations: state.resumeProfile.organizations.map((item) =>
              item.id === orgId ? { ...item, bulletPoints: [...item.bulletPoints, ""] } : item
            )
          }
        })),
      updateOrganizationBullet: (orgId, index, value) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            organizations: state.resumeProfile.organizations.map((item) => {
              if (item.id !== orgId) return item;
              const bulletPoints = [...item.bulletPoints];
              bulletPoints[index] = value;
              return { ...item, bulletPoints };
            })
          }
        })),
      removeOrganizationBullet: (orgId, index) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            organizations: state.resumeProfile.organizations.map((item) => {
              if (item.id !== orgId) return item;
              const bulletPoints = item.bulletPoints.filter((_, idx) => idx !== index);
              return { ...item, bulletPoints: bulletPoints.length ? bulletPoints : [""] };
            })
          }
        })),
      addCertification: () =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            certificationItems: [
              ...state.resumeProfile.certificationItems,
              { id: createId(), name: "", issuer: "", year: "" }
            ]
          }
        })),
      updateCertification: (id, patch) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            certificationItems: state.resumeProfile.certificationItems.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            )
          }
        })),
      removeCertification: (id) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            certificationItems: state.resumeProfile.certificationItems.filter((item) => item.id !== id)
          }
        })),
      updateSkills: (field, values) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            skills: { ...state.resumeProfile.skills, [field]: values }
          }
        })),
      addSkillGroup: () =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            skills: {
              ...state.resumeProfile.skills,
              groups: [
                ...(state.resumeProfile.skills.groups ?? []),
                { id: createId(), category: "", items: [] }
              ]
            }
          }
        })),
      updateSkillGroup: (id, patch) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            skills: {
              ...state.resumeProfile.skills,
              groups: (state.resumeProfile.skills.groups ?? []).map((grp) =>
                grp.id === id ? { ...grp, ...patch } : grp
              )
            }
          }
        })),
      removeSkillGroup: (id) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            skills: {
              ...state.resumeProfile.skills,
              groups: (state.resumeProfile.skills.groups ?? []).filter((grp) => grp.id !== id)
            }
          }
        })),
      setSkillGroups: (groups) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            skills: {
              ...state.resumeProfile.skills,
              groups
            }
          }
        })),
      addSkillItem: (field, skill) => {
        const clean = skill.trim();
        if (!clean) return;
        const currentProfile = getState().resumeProfile;
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

        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            skills: {
              ...state.resumeProfile.skills,
              [field]: existsFlat ? current : [...current, clean],
              groups: nextGroups
            }
          }
        }));

        const { matchAnalytics, resumeProfile, jobTarget } = getState();
        if (matchAnalytics.hasAnalyzed && jobTarget.rawDescription.trim()) {
          set({ matchAnalytics: analyzeMatch(resumeProfile, jobTarget) });
        }
      },
      setResumeProfile: (profile) => set({ resumeProfile: profile }),
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
      applySuggestion: (id, value) => {
        const suggestion = getState().suggestions.find((item) => item.id === id);
        if (!suggestion) return;
        const finalValue = value ?? suggestion.suggestion;
        const sourceId = suggestion.sourceId || suggestion.experienceId;

        if (suggestion.sourceType === "project") {
          getState().updateProjectBullet(sourceId, suggestion.bulletIndex, finalValue);
        } else if (suggestion.sourceType === "organization") {
          getState().updateOrganizationBullet(sourceId, suggestion.bulletIndex, finalValue);
        } else {
          getState().updateBullet(sourceId, suggestion.bulletIndex, finalValue);
        }

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
        set({
          resumeProfile: emptyResumeProfile(),
          jobTarget: emptyJobTarget(),
          matchAnalytics: emptyAnalytics(),
          suggestions: [],
          aiTranslatedProfiles: {},
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
    }),
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
              breakdown: rawAnalytics.breakdown ?? baseAnalytics.breakdown,
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

        const restApiPreset = persisted.restApiPreset ?? "gemini";
        const restApiFormat = persisted.restApiFormat ?? "gemini";

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
          aiTranslatedProfiles: {},
          aiEnabled: Boolean(persisted.aiEnabled),
          localAiMode,
          webLlmModelId: persisted.webLlmModelId || DEFAULT_WEBLLM_MODEL_ID,
          localServerUrl: persisted.localServerUrl || "http://localhost:11434",
          localServerModel: persisted.localServerModel || "",
          restApiPreset,
          restApiFormat,
          restApiUrl: persisted.restApiUrl || "https://generativelanguage.googleapis.com/v1beta",
          restApiModel: persisted.restApiModel || "gemini-2.5-flash",
          restApiKey: "",
          localAiStatus: "idle",
          localAiProgress: 0,
          localAiProgressText: "",
          localAiLoadedModel: "",
          localAiError: "",
          checkedAdminItems: persisted.checkedAdminItems ?? {}
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

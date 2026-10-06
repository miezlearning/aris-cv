import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import type { Education, JobTarget, MatchAnalytics, ResumeProfile, RewriteSuggestion, WorkExperience } from "@/types/resume";
import { emptyAnalytics, emptyJobTarget, emptyResumeProfile, createId } from "@/lib/defaults";

type AppState = {
  resumeProfile: ResumeProfile;
  jobTarget: JobTarget;
  matchAnalytics: MatchAnalytics;
  suggestions: RewriteSuggestion[];
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
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
  updateSkills: (field: keyof ResumeProfile["skills"], values: string[]) => void;
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
    const value = await get<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  }
};

export const useCvStore = create<AppState>()(
  persist(
    (set, getState) => ({
      resumeProfile: emptyResumeProfile(),
      jobTarget: emptyJobTarget(),
      matchAnalytics: emptyAnalytics(),
      suggestions: [],
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
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
                startDate: "",
                endDate: "Present",
                isCurrent: true,
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
                graduationDate: ""
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
      updateSkills: (field, values) =>
        set((state) => ({
          resumeProfile: {
            ...state.resumeProfile,
            skills: { ...state.resumeProfile.skills, [field]: values }
          }
        })),
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
        getState().updateBullet(suggestion.experienceId, suggestion.bulletIndex, finalValue);
        getState().updateSuggestion(id, { suggestion: finalValue, status: value ? "edited" : "accepted" });
      },
      rejectSuggestion: (id) => getState().updateSuggestion(id, { status: "rejected" }),
      resetAll: () =>
        set({
          resumeProfile: emptyResumeProfile(),
          jobTarget: emptyJobTarget(),
          matchAnalytics: emptyAnalytics(),
          suggestions: []
        })
    }),
    {
      name: "quicktailor-cv-store",
      storage: createJSONStorage(() => indexedDbStorage),
      partialize: (state) => ({
        resumeProfile: state.resumeProfile,
        jobTarget: state.jobTarget,
        matchAnalytics: state.matchAnalytics,
        suggestions: state.suggestions
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);

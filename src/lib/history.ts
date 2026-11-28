import type { ResumeProfile } from "@/types/resume";

export const MAX_HISTORY_ENTRIES = 30;
export const COALESCE_WINDOW_MS = 1200;

export type HistorySnapshot = {
  profile: ResumeProfile;
  label: string;
  timestamp: number;
  coalesceKey?: string;
};

export type ResumeHistoryState = {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
};

export const cloneResumeProfile = (profile: ResumeProfile): ResumeProfile => {
  if (typeof structuredClone === "function") {
    return structuredClone(profile);
  }
  return JSON.parse(JSON.stringify(profile)) as ResumeProfile;
};

export const pushHistorySnapshot = (
  history: ResumeHistoryState,
  previousProfile: ResumeProfile,
  options: { label: string; coalesceKey?: string; now?: number }
): ResumeHistoryState => {
  const now = options.now ?? Date.now();
  const past = history.past;
  const last = past[past.length - 1];

  if (
    options.coalesceKey &&
    last &&
    last.coalesceKey === options.coalesceKey &&
    now - last.timestamp < COALESCE_WINDOW_MS
  ) {
    const updatedPast = [...past.slice(0, -1), { ...last, label: options.label, timestamp: now }];
    return { past: updatedPast, future: [] };
  }

  const nextPast = [
    ...past,
    {
      profile: cloneResumeProfile(previousProfile),
      label: options.label,
      timestamp: now,
      coalesceKey: options.coalesceKey
    }
  ].slice(-MAX_HISTORY_ENTRIES);

  return { past: nextPast, future: [] };
};

export const applyUndo = (
  history: ResumeHistoryState,
  currentProfile: ResumeProfile,
  now = Date.now()
): {
  nextProfile: ResumeProfile;
  nextHistory: ResumeHistoryState;
  undoneLabel: string;
} | null => {
  if (history.past.length === 0) return null;
  const target = history.past[history.past.length - 1];
  const nextPast = history.past.slice(0, -1);
  const nextFuture = [
    ...history.future,
    {
      profile: cloneResumeProfile(currentProfile),
      label: target.label,
      timestamp: now
    }
  ].slice(-MAX_HISTORY_ENTRIES);

  return {
    nextProfile: cloneResumeProfile(target.profile),
    nextHistory: { past: nextPast, future: nextFuture },
    undoneLabel: target.label
  };
};

export const applyRedo = (
  history: ResumeHistoryState,
  currentProfile: ResumeProfile,
  now = Date.now()
): {
  nextProfile: ResumeProfile;
  nextHistory: ResumeHistoryState;
  redoneLabel: string;
} | null => {
  if (history.future.length === 0) return null;
  const target = history.future[history.future.length - 1];
  const nextFuture = history.future.slice(0, -1);
  const nextPast = [
    ...history.past,
    {
      profile: cloneResumeProfile(currentProfile),
      label: target.label,
      timestamp: now
    }
  ].slice(-MAX_HISTORY_ENTRIES);

  return {
    nextProfile: cloneResumeProfile(target.profile),
    nextHistory: { past: nextPast, future: nextFuture },
    redoneLabel: target.label
  };
};

"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { ArrowsLeftRight, CheckCircle, ClipboardText, WarningCircle } from "@phosphor-icons/react";

export type CardAccent = "butter" | "sky" | "sage" | "clay" | "moss";

const accentMedallion: Record<CardAccent, string> = {
  butter: "bg-[#FFF0A8] text-[#251813] border-[#251813]",
  sky: "bg-[#D6F3FA] text-[#124959] border-[#251813]",
  sage: "bg-[#DFF5DA] text-[#144C32] border-[#251813]",
  clay: "bg-[#FFE3D8] text-[#7B1F14] border-[#251813]",
  moss: "bg-[#1F6B57] text-white border-[#251813]"
};

const accentHeaderTint: Record<CardAccent, string> = {
  butter: "card-tint-butter",
  sky: "card-tint-sky",
  sage: "card-tint-sage",
  clay: "card-tint-clay",
  moss: "card-tint-sage"
};

export const SectionCard = ({
  title,
  description,
  children,
  actions,
  emphasis = "default",
  icon,
  accent
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  emphasis?: "default" | "focal";
  icon?: ReactNode;
  accent?: CardAccent;
}) => (
  <section
    className={`min-w-0 w-full overflow-hidden ${
      emphasis === "focal" ? "doodle-card bg-[#FFFDF8]" : "surface-card"
    }`}
  >
    <div
      className={`px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[#D9CEBC] ${
        accent ? accentHeaderTint[accent] : ""
      }`}
    >
      <div className="min-w-0 flex items-start gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 shadow-[2px_2px_0_rgba(37,24,19,0.12)] ${
              accent ? accentMedallion[accent] : "bg-[#FFF0A8] text-[#251813] border-[#251813]"
            }`}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#251813]">
            {emphasis === "focal" ? <span className="doodle-title-mark">{title}</span> : title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#4E3E36]">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5">{actions}</div> : null}
    </div>
    <div className="p-5 sm:p-6 min-w-0">{children}</div>
  </section>
);

export const Field = ({
  label,
  children,
  hint,
  className = ""
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) => (
  <label className={`flex flex-col gap-1.5 text-sm font-semibold text-[#251813] ${className}`}>
    <span className="leading-snug">{label}</span>
    {children}
    {hint ? <span className="text-[13px] font-normal text-[#59483F] leading-relaxed">{hint}</span> : null}
  </label>
);

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`input doodle-input min-h-[44px] w-full px-3.5 py-2 text-sm sm:text-[15px] text-[#251813] bg-white rounded-xl border border-[#C2B49E] focus:outline-none focus:border-[#1F6B57] focus:ring-2 focus:ring-[#1F6B57]/20 transition-colors placeholder:text-[#6B584D] ${props.className ?? ""}`}
  />
);

export const SelectInput = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`select doodle-input min-h-[44px] w-full px-3.5 py-2 text-sm sm:text-[15px] text-[#251813] bg-white rounded-xl border border-[#C2B49E] focus:outline-none focus:border-[#1F6B57] focus:ring-2 focus:ring-[#1F6B57]/20 transition-colors ${props.className ?? ""}`}
  />
);

export const TextArea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`textarea doodle-input w-full px-3.5 py-2.5 text-sm sm:text-[15px] leading-relaxed text-[#251813] bg-white rounded-xl border border-[#C2B49E] focus:outline-none focus:border-[#1F6B57] focus:ring-2 focus:ring-[#1F6B57]/20 transition-colors placeholder:text-[#6B584D] ${props.className ?? ""}`}
  />
);

export const Button = ({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) => {
  const styles = {
    primary:
      "bg-[#1F6B57] text-white border-2 border-[#251813] shadow-[2px_3px_0_rgba(37,24,19,0.18)] hover:bg-[#154538] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-none",
    secondary:
      "bg-white text-[#251813] border border-[#C2B49E] shadow-2xs hover:bg-[#FFF8DF] hover:border-[#251813]/60 active:scale-[0.98]",
    ghost:
      "bg-transparent text-[#4E3E36] border border-transparent hover:bg-[#F3E7C8] hover:text-[#251813] active:scale-[0.98]",
    danger:
      "bg-[#FFE3D8] text-[#7B1F14] border border-[#E9A590] hover:bg-[#FFD3C2] active:scale-[0.98]"
  };

  return (
    <button
      {...props}
      className={`btn doodle-btn min-h-[44px] px-4 sm:px-5 py-2 text-sm font-bold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none ${styles[variant]} ${className}`}
    />
  );
};

export type TagTone = "match" | "partial" | "semantic" | "missing" | "gap" | "admin" | "neutral";

const tagStyles: Record<TagTone, string> = {
  match: "bg-[#DFF5DA] text-[#144C32] border-[#9FD499]",
  partial: "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]",
  semantic: "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]",
  missing: "bg-[#FFE3D8] text-[#7B1F14] border-[#E9A590]",
  gap: "bg-[#FFE3D8] text-[#7B1F14] border-[#E9A590]",
  admin: "bg-[#D6F3FA] text-[#124959] border-[#94D1DF]",
  neutral: "bg-white text-[#3F3029] border-[#D9CEBC]"
};

const tagPrefix: Record<TagTone, string | null> = {
  match: "Cocok:",
  partial: "Serupa:",
  semantic: "Serupa:",
  missing: "Perlu:",
  gap: "Perlu:",
  admin: "Berkas:",
  neutral: null
};

const renderTagIcon = (tone: TagTone) => {
  if (tone === "match") return <CheckCircle size={14} weight="duotone" className="shrink-0" aria-hidden="true" />;
  if (tone === "partial" || tone === "semantic") {
    return <ArrowsLeftRight size={14} weight="duotone" className="shrink-0" aria-hidden="true" />;
  }
  if (tone === "missing" || tone === "gap") {
    return <WarningCircle size={14} weight="duotone" className="shrink-0" aria-hidden="true" />;
  }
  if (tone === "admin") {
    return <ClipboardText size={14} weight="duotone" className="shrink-0" aria-hidden="true" />;
  }
  return null;
};

export const Tag = ({
  tone,
  showPrefix = false,
  children
}: {
  tone: TagTone;
  showPrefix?: boolean;
  children: ReactNode;
}) => {
  const prefix = showPrefix ? tagPrefix[tone] : null;
  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border break-words leading-snug ${tagStyles[tone]}`}
    >
      {showPrefix ? renderTagIcon(tone) : null}
      {prefix ? <span className="font-extrabold opacity-90">{prefix}</span> : null}
      <span>{children}</span>
    </span>
  );
};

export const EmptyState = ({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) => (
  <div className="rounded-2xl border border-dashed border-[#C2B49E] bg-[#FFFDF8] p-5 sm:p-6 text-sm">
    <div className="flex items-start gap-3.5">
      {icon ? (
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#DFC25A] bg-[#FFF0A8] text-[#251813]"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-base font-bold text-[#251813]">{title}</p>
        <p className="mt-1.5 leading-relaxed text-[#4E3E36] max-w-2xl">{description}</p>
        {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  </div>
);

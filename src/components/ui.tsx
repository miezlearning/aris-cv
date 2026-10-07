import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export const SectionCard = ({
  title,
  description,
  children,
  actions
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) => (
  <section className="doodle-card bg-[var(--paper-strong)] p-5 sm:p-7">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-line/15 pb-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          <span className="doodle-title-mark">{title}</span>
        </h2>
        {description ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#5c4a40]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
    </div>
    {children}
  </section>
);

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="grid gap-2 text-sm font-semibold text-ink">
    <span className="flex items-center justify-between">
      <span>{label}</span>
    </span>
    {children}
    {hint ? <span className="text-xs font-normal text-[#6b584d] leading-relaxed">{hint}</span> : null}
  </label>
);

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`input doodle-input min-h-[46px] w-full px-4 py-2.5 text-sm text-ink bg-white rounded-xl border-2 border-line/75 focus:border-moss focus:ring-4 focus:ring-moss/10 transition-all placeholder:text-[#8c786e] ${props.className ?? ""}`}
  />
);

export const TextArea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`textarea doodle-input w-full px-4 py-3 text-sm leading-relaxed text-ink bg-white rounded-xl border-2 border-line/75 focus:border-moss focus:ring-4 focus:ring-moss/10 transition-all placeholder:text-[#8c786e] ${props.className ?? ""}`}
  />
);

export const Button = ({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) => {
  const styles = {
    primary: "bg-moss text-white hover:bg-[#154538]",
    secondary: "bg-white text-ink hover:bg-[#fff0a8]",
    danger: "bg-[#ffe1d6] text-[#7b1f14] hover:bg-[#ffd0c0]"
  };

  return (
    <button
      {...props}
      className={`btn doodle-btn min-h-[44px] px-4 sm:px-5 py-2.5 text-sm font-bold rounded-xl border-2 border-line shadow-[2px_3px_0_rgba(37,24,19,0.14)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none ${styles[variant]} ${className}`}
    />
  );
};

export const Tag = ({ tone, children }: { tone: "match" | "semantic" | "missing" | "neutral"; children: ReactNode }) => {
  const styles = {
    match: "bg-[#dff4dc] text-[#155436] border-[#b2e5ac]",
    semantic: "bg-[#fff0a8] text-[#604200] border-[#edd072]",
    missing: "bg-[#ffe1d6] text-[#7b1f14] border-[#f7b7a3]",
    neutral: "bg-white text-[#3f3029] border-line/25"
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border shadow-2xs ${styles[tone]}`}>
      {children}
    </span>
  );
};

export const EmptyState = ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
  <div className="rounded-2xl border-2 border-dashed border-line/40 bg-white/95 p-6 text-sm shadow-[2px_3px_0_rgba(37,24,19,0.06)]">
    <p className="text-base font-bold text-ink">{title}</p>
    <p className="mt-1.5 leading-relaxed text-[#57443b] max-w-2xl">{description}</p>
    {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
  </div>
);

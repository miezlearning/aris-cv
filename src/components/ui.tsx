import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export const SectionCard = ({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) => (
  <section className="doodle-card doodle-tape bg-[var(--paper-strong)] p-4 sm:p-5">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-black tracking-tight text-ink"><span className="doodle-title-mark">{title}</span></h2>
        {description ? <p className="mt-2 text-sm leading-6 text-[#4d3b33]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
    {children}
  </section>
);

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="grid gap-1.5 text-sm font-bold text-ink">
    <span>{label}</span>
    {children}
    {hint ? <span className="text-xs font-medium text-[#57443b]">{hint}</span> : null}
  </label>
);

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`input doodle-input min-h-11 w-full px-3 py-2 text-sm text-ink placeholder:text-[#6a554b] ${props.className ?? ""}`}
  />
);

export const TextArea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`textarea doodle-input w-full px-3 py-2 text-sm leading-6 text-ink placeholder:text-[#6a554b] ${props.className ?? ""}`}
  />
);

export const Button = ({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) => {
  const styles = {
    primary: "bg-moss text-white hover:bg-[#154538]",
    secondary: "bg-white text-ink hover:bg-[#fff0a8]",
    danger: "bg-[#ffe1d6] text-[#7b1f14] hover:bg-[#ffd0c0]"
  };

  return (
    <button
      {...props}
      className={`btn doodle-btn px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-55 ${styles[variant]} ${className}`}
    />
  );
};

export const Tag = ({ tone, children }: { tone: "match" | "semantic" | "missing" | "neutral"; children: ReactNode }) => {
  const styles = {
    match: "bg-[#dff4dc] text-[#155436]",
    semantic: "bg-[#fff0a8] text-[#604200]",
    missing: "bg-[#ffe1d6] text-[#7b1f14]",
    neutral: "bg-white text-[#3f3029]"
  };

  return <span className={`doodle-chip inline-flex px-2.5 py-1 text-xs font-black ${styles[tone]}`}>{children}</span>;
};

export const EmptyState = ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
  <div className="rounded-[19px_14px_21px_16px] border-2 border-dashed border-line bg-white p-4 text-sm shadow-[3px_4px_0_rgba(37,24,19,0.10)]">
    <p className="font-black text-ink">{title}</p>
    <p className="mt-1 leading-6 text-[#57443b]">{description}</p>
    {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
  </div>
);

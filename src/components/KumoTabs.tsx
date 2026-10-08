"use client";

import { useId, type ReactNode } from "react";
import { motion } from "motion/react";

export type TabItem<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
};

export type KumoTabsProps<T extends string = string> = {
  tabs: TabItem<T>[];
  value: T;
  onValueChange: (val: T) => void;
  layoutId?: string;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
};

/**
 * Kumo-style Segmented Tabs Component:
 * - Fluid sliding indicator with spring physics (zero splash, zero ripple, zero button pop).
 * - Stateful controlled tabs with accessible keyboard support.
 * - Smooth, quiet transitions inspired by Kumo UI.
 */
export const KumoTabs = <T extends string>({
  tabs,
  value,
  onValueChange,
  layoutId: customLayoutId,
  size = "md",
  className = "",
  ariaLabel = "Tab navigasi"
}: KumoTabsProps<T>) => {
  const autoId = useId();
  const layoutId = customLayoutId ?? `kumo-tab-${autoId}`;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.value === value);
    if (currentIndex === -1) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      onValueChange(tabs[nextIndex].value);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      onValueChange(tabs[prevIndex].value);
    } else if (event.key === "Home") {
      event.preventDefault();
      onValueChange(tabs[0].value);
    } else if (event.key === "End") {
      event.preventDefault();
      onValueChange(tabs[tabs.length - 1].value);
    }
  };

  const isSmall = size === "sm";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex flex-wrap items-center gap-1 rounded-2xl bg-[#ebe4d4]/85 p-1.5 border border-line/15 select-none shadow-inner ${className}`}
    >
      {tabs.map((tab) => {
        const isSelected = value === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onValueChange(tab.value)}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-xl transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-1 ${
              isSmall ? "px-3 py-1.5 text-xs font-semibold" : "min-h-[42px] px-4 py-2 text-sm font-bold"
            } ${
              isSelected
                ? "text-ink"
                : "text-[#5c4a40] hover:text-ink hover:bg-black/[0.03]"
            }`}
          >
            {/* The sliding pill indicator */}
            {isSelected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_8px_rgba(37,24,19,0.08),0_1px_3px_rgba(37,24,19,0.06)] border border-line/12 -z-10"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34,
                  mass: 0.8
                }}
              />
            )}

            {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                  isSelected
                    ? "bg-[#e4f6df] text-[#155436]"
                    : "bg-black/5 text-[#5c4a40]"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

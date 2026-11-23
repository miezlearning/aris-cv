"use client";

import { useId, type ReactNode } from "react";
import { motion } from "motion/react";

export type TabItem<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  done?: boolean;
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
      className={`relative flex flex-wrap items-center gap-1 rounded-2xl bg-[#F3EAD7] p-1.5 border border-[#D9CEBC] select-none ${className}`}
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
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1F6B57] whitespace-nowrap ${
              isSmall
                ? "min-h-[40px] px-3 py-1.5 text-xs font-semibold"
                : "min-h-[44px] px-3.5 py-2 text-[13px] sm:text-sm font-bold"
            } ${
              isSelected
                ? "text-[#251813]"
                : "text-[#4E3E36] hover:text-[#251813] hover:bg-white/40"
            }`}
          >
            {isSelected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-white shadow-xs border border-[#C2B49E] -z-10"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34,
                  mass: 0.8
                }}
              />
            )}

            {tab.done !== undefined && (
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  tab.done ? "bg-[#1F6B57]" : "bg-[#C2B49E]"
                }`}
              />
            )}

            {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                  isSelected
                    ? "bg-[#E4F6DF] text-[#144C32]"
                    : "bg-white/80 text-[#4E3E36]"
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

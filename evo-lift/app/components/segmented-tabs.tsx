import type { ReactNode } from "react";
import {
  segmentedTabButtonHeightClassName,
  segmentedTabButtonWidthClassName,
  segmentedTabRowClassName,
} from "@/app/components/segmented-tab-layout";

export type SegmentedTabOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedTabsButtonLayout = "default" | "equal-row";

type SegmentedTabsProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedTabOption<T>[];
  className?: string;
  buttonMinWidthClassName?: string;
  /**
   * `equal-row`: one row on all breakpoints; buttons share width (use for a few short labels on
   * narrow screens). `default`: stacked full-width buttons on small screens, inline from `sm`.
   */
  buttonLayout?: SegmentedTabsButtonLayout;
  /**
   * With `equal-row`, two columns below `sm` so a longer label stays inside the control.
   * From `sm`, one shared row.
   */
  equalRowWrap?: boolean;
  /** Overrides the default `aria-label` on the tab list. */
  tabListAriaLabel?: string;
  /**
   * When set, each tab gets `id="${a11yIdPrefix}-tab-${value}"` and `aria-controls` pointing at
   * a panel with `id="${a11yIdPrefix}-panel-${value}"` (wire those on matching `role="tabpanel"` regions).
   */
  a11yIdPrefix?: string;
};

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
  buttonMinWidthClassName = "sm:min-w-36",
  buttonLayout = "default",
  equalRowWrap = false,
  tabListAriaLabel = "Sections",
  a11yIdPrefix,
}: SegmentedTabsProps<T>) {
  const rowClassName = segmentedTabRowClassName(buttonLayout, equalRowWrap);
  const buttonWidthClassName = segmentedTabButtonWidthClassName(buttonLayout, equalRowWrap);
  const buttonHeightClassName = segmentedTabButtonHeightClassName(buttonLayout, equalRowWrap);

  return (
    <div
      className={`rounded-md border border-zinc-300 bg-zinc-50 p-1 ${className ?? ""}`.trim()}
      role="tablist"
      aria-label={tabListAriaLabel}
    >
      <div className={rowClassName}>
        {options.map((option) => {
          const isActive = option.value === value;
          const tabId = a11yIdPrefix ? `${a11yIdPrefix}-tab-${option.value}` : undefined;
          const panelId = a11yIdPrefix ? `${a11yIdPrefix}-panel-${option.value}` : undefined;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              id={tabId}
              aria-controls={panelId}
              aria-selected={isActive}
              onClick={() => onChange(option.value)}
              className={`inline-flex ${buttonHeightClassName} items-center justify-center gap-1.5 rounded-md text-center text-sm font-medium transition-colors focus-visible:z-10 ${buttonWidthClassName} ${buttonMinWidthClassName} ${
                isActive
                  ? "bg-sky-100 text-sky-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

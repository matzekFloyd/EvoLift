"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import {
  checkboxBoxClassName,
  checkboxInputClassName,
  checkboxLabelClassName,
  type CheckboxAlign,
} from "@/app/components/checkbox-classes";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Lines the box up with the first line when the label wraps. */
  align?: CheckboxAlign;
  className?: string;
  children: ReactNode;
};

/** Tick box used everywhere a lifter checks something. The visible label is the accessible name. */
export function Checkbox({
  checked,
  onChange,
  disabled = false,
  align = "center",
  className,
  children,
}: CheckboxProps) {
  return (
    <label className={checkboxLabelClassName({ align, disabled, className })}>
      <span className={checkboxBoxClassName(align)}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className={checkboxInputClassName}
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

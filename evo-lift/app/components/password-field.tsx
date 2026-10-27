"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { textFieldClassName } from "@/app/components/text-field-classes";

type PasswordAutocomplete = "current-password" | "new-password";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: PasswordAutocomplete;
  placeholder?: string;
  /** Persistent helper under the input (e.g. strength rules). */
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  /** A control on the label row, such as Forgot password. Stays out of the field name. */
  labelAside?: ReactNode;
};

const toggleClassName =
  "absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/60";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  hint,
  required = false,
  disabled = false,
  labelAside,
}: PasswordFieldProps) {
  const inputId = useId();
  const hintId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="block text-sm font-medium">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId}>{label}</label>
        {labelAside ? <div className="shrink-0 font-normal">{labelAside}</div> : null}
      </div>
      <div className="relative mt-1">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className={textFieldClassName({ size: "default", className: "w-full pr-10" })}
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className={toggleClassName}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs font-normal text-zinc-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

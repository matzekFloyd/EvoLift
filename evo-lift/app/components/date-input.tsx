"use client";

import type { ComponentProps } from "react";
import { textFieldClassName, type TextFieldSize } from "@/app/components/text-field-classes";

export type DateInputProps = Omit<ComponentProps<"input">, "type" | "size"> & {
  /** Same sizes as the shared single-line field. Compact is a short filter. */
  size?: TextFieldSize;
};

/**
 * Native date field on the shared single-line field.
 * The whole control opens the browser date picker where supported.
 */
export function DateInput({
  className = "",
  size = "default",
  onClick,
  disabled,
  readOnly,
  ...props
}: DateInputProps) {
  const cursorClass = disabled
    ? "cursor-not-allowed"
    : readOnly
      ? "cursor-default"
      : "cursor-pointer";

  return (
    <input
      {...props}
      type="date"
      disabled={disabled}
      readOnly={readOnly}
      className={textFieldClassName({
        size,
        readOnly: readOnly === true,
        className: `${className} ${cursorClass}`.trim(),
      })}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled || readOnly) {
          return;
        }
        const input = event.currentTarget;
        try {
          input.showPicker?.();
        } catch {
          /* Unsupported, blocked, or already open */
        }
      }}
    />
  );
}

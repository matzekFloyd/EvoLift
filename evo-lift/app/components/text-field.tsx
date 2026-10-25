import type { ComponentProps } from "react";
import { textFieldClassName, type TextFieldSize } from "@/app/components/text-field-classes";

type TextFieldProps = Omit<ComponentProps<"input">, "size"> & {
  /** Default is the name and number field. Compact is the short set-row field. */
  size?: TextFieldSize;
};

/** One single-line field. The visible label stays on the surrounding label or column. */
export function TextField({ size = "default", className, readOnly, ...props }: TextFieldProps) {
  return (
    <input
      {...props}
      readOnly={readOnly}
      className={textFieldClassName({ size, readOnly: readOnly === true, className })}
    />
  );
}

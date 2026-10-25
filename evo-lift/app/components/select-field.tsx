import type { ComponentProps } from "react";
import { textFieldClassName, type TextFieldSize } from "@/app/components/text-field-classes";

type SelectFieldProps = Omit<ComponentProps<"select">, "size"> & {
  size?: TextFieldSize;
};

/** Same single-line chrome as TextField. The options stay the caller's children. */
export function SelectField({ size = "default", className, ...props }: SelectFieldProps) {
  return <select {...props} className={textFieldClassName({ size, className })} />;
}

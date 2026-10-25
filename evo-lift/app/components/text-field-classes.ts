export type TextFieldSize = "default" | "compact";

/**
 * One single-line field: zinc border, rounded-md, text-sm.
 * Focus stays the sky ring in globals.css, so this class does not add a second ring.
 * Width and margin stay with the caller. Compact is the short set-row padding, not a second style.
 */
export function textFieldClassName(input: {
  size: TextFieldSize;
  readOnly?: boolean;
  className?: string;
}): string {
  const padding = input.size === "compact" ? "px-2 py-1" : "px-3 py-2";
  const readOnly = input.readOnly ? "read-only:bg-zinc-50 read-only:text-zinc-700" : "";
  return [
    "rounded-md border border-zinc-300 bg-white text-sm",
    "disabled:cursor-not-allowed disabled:opacity-60",
    padding,
    readOnly,
    input.className ?? "",
  ]
    .filter((part) => part.length > 0)
    .join(" ");
}

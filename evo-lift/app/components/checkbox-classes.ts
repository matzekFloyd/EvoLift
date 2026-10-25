export type CheckboxAlign = "center" | "start";

/**
 * One box on every screen: 16px, zinc border, sky check, sky focus ring.
 * `appearance-none` is required so the border is ours; native checkboxes ignore it.
 */
export const checkboxInputClassName = [
  "peer absolute inset-0 m-0 h-4 w-4 cursor-pointer appearance-none rounded border border-zinc-300 bg-white p-0",
  "checked:border-sky-700 checked:bg-sky-700",
  "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
  "disabled:cursor-not-allowed",
].join(" ");

export function checkboxBoxClassName(align: CheckboxAlign): string {
  const offset = align === "start" ? "mt-0.5" : "";
  return ["relative inline-flex h-4 w-4 shrink-0", offset].filter(Boolean).join(" ");
}

/** Label row. Disabled is faded and refuses the pointer; it does not change the box itself. */
export function checkboxLabelClassName(input: {
  align: CheckboxAlign;
  disabled: boolean;
  className?: string;
}): string {
  return [
    "inline-flex min-h-10 max-w-full select-none gap-2 text-sm font-medium text-zinc-800",
    input.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
    input.align === "start" ? "items-start" : "items-center",
    input.className ?? "",
  ]
    .filter((part) => part.length > 0)
    .join(" ");
}

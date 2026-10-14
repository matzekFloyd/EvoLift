import type { ComponentProps } from "react";

/** Grey group inside a white panel. Same border, radius, and fill on every page. */
export const panelInsetClassName = "rounded-md border border-zinc-200 bg-zinc-50/80";

export function panelInsetClass(className?: string) {
  return [panelInsetClassName, className].filter(Boolean).join(" ");
}

type PanelInsetProps = ComponentProps<"div">;

export function PanelInset({ className, ...props }: PanelInsetProps) {
  return (
    <div className={panelInsetClass(className)} {...props} />
  );
}

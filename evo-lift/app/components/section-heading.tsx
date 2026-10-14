import type { ComponentProps } from "react";

type SectionHeadingProps = ComponentProps<"h2">;

/** Shared section title. Same size, weight, and color on every page. */
export function SectionHeading({ className, ...props }: SectionHeadingProps) {
  return (
    <h2
      className={["text-base font-medium text-zinc-800", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

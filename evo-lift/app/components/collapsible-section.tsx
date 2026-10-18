"use client";

import { ChevronRight } from "lucide-react";
import { useId, type ReactNode } from "react";
import { collapsibleSectionCanToggle } from "@/app/components/collapsible-section-open";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  /** Optional leading icon after the chevron (Insights sections). */
  icon?: ReactNode;
  /** Muted count after the title (Goals Active / Achieved). */
  count?: number;
  /** When true, content stays visible and the header is not a toggle. */
  alwaysOpen?: boolean;
  /**
   * When true, the section starts expanded. Uses the native `open` attribute;
   * omit (or false) to match Goals and start collapsed.
   */
  defaultOpen?: boolean;
  /**
   * Extra controls under the header when open (e.g. a metric switch).
   * Native `details` hides this while collapsed.
   */
  headerAside?: ReactNode;
  /**
   * When false, render without the muted PanelInset shell (e.g. Goals groups,
   * or grey KPI tiles that already provide the inset surface).
   */
  inset?: boolean;
  className?: string;
  titleId?: string;
};

export function CollapsibleSection({
  title,
  icon,
  count,
  children,
  alwaysOpen = false,
  defaultOpen = false,
  headerAside,
  inset = true,
  className,
  titleId,
}: CollapsibleSectionProps) {
  const autoId = useId();
  const headingId = titleId ?? autoId;
  const canToggle = collapsibleSectionCanToggle(alwaysOpen);

  const titleRow = (
    <>
      {icon ? (
        <span className="shrink-0 text-zinc-500 [&_svg]:h-3.5 [&_svg]:w-3.5" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">{title}</span>
      {count != null ? (
        <span className="font-normal tabular-nums text-zinc-500">{count}</span>
      ) : null}
    </>
  );

  const body = (
    <>
      {headerAside ? <div className="mt-3">{headerAside}</div> : null}
      <div className="mt-3">{children}</div>
    </>
  );

  let content: ReactNode;

  if (!canToggle) {
    content = (
      <>
        <SectionHeading id={headingId} className="inline-flex min-w-0 items-center gap-1.5">
          {titleRow}
        </SectionHeading>
        {body}
      </>
    );
  } else {
    content = (
      <details className="group" {...(defaultOpen ? { open: true } : {})}>
        <summary className="w-fit cursor-pointer list-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 [&::-webkit-details-marker]:hidden">
          <SectionHeading id={headingId} className="inline-flex items-center gap-1.5">
            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-90"
              aria-hidden
            />
            {titleRow}
          </SectionHeading>
        </summary>
        {body}
      </details>
    );
  }

  if (!inset) {
    return <section className={className}>{content}</section>;
  }

  return (
    <PanelInset className={["p-4", className].filter(Boolean).join(" ")}>{content}</PanelInset>
  );
}

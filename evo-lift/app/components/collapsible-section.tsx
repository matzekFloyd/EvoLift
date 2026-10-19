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
   * Compact chips in the summary row (e.g. Exercise progress pace counts).
   * Shown only while the section is collapsed.
   */
  titleAside?: ReactNode;
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
  titleAside,
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

  if (!canToggle) {
    const staticContent = (
      <>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <SectionHeading id={headingId} className="inline-flex min-w-0 items-center gap-1.5">
            {titleRow}
          </SectionHeading>
          {titleAside}
        </div>
        {body}
      </>
    );
    if (!inset) {
      return <section className={className}>{staticContent}</section>;
    }
    return (
      <PanelInset className={["p-4", className].filter(Boolean).join(" ")}>{staticContent}</PanelInset>
    );
  }

  const summaryClassName = [
    "flex w-full cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1.5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-inset",
    "[&::-webkit-details-marker]:hidden",
    inset ? "px-4 py-4 hover:bg-zinc-100/90" : "rounded-md py-1 hover:bg-zinc-100/60",
  ].join(" ");

  const details = (
    <details className="group" {...(defaultOpen ? { open: true } : {})}>
      <summary className={summaryClassName}>
        <SectionHeading id={headingId} className="inline-flex min-w-0 items-center gap-1.5">
          <ChevronRight
            className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-90"
            aria-hidden
          />
          {titleRow}
        </SectionHeading>
        {titleAside ? <span className="contents group-open:hidden">{titleAside}</span> : null}
      </summary>
      {inset ? <div className="px-4 pb-4">{body}</div> : body}
    </details>
  );

  if (!inset) {
    return <section className={className}>{details}</section>;
  }

  return <PanelInset className={["overflow-hidden p-0", className].filter(Boolean).join(" ")}>{details}</PanelInset>;
}

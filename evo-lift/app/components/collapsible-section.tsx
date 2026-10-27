"use client";

import { ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode, type SyntheticEvent } from "react";
import {
  collapsibleSectionCanToggle,
  initialCollapsibleSectionOpen,
  shouldRenderCollapsibleBody,
} from "@/app/components/collapsible-section-open";
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
   * When true, the section starts expanded. Uses the native `open` attribute.
   * Omit (or false) to start collapsed.
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
  /**
   * `section` matches page SectionHeading weight.
   * `chrome` is quieter for nested toggles under a real section (Days, Sessions).
   */
  titleTone?: "section" | "chrome";
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
  titleTone = "section",
  className,
  titleId,
}: CollapsibleSectionProps) {
  const autoId = useId();
  const headingId = titleId ?? autoId;
  const canToggle = collapsibleSectionCanToggle(alwaysOpen);
  const [open, setOpen] = useState(() =>
    initialCollapsibleSectionOpen({ alwaysOpen, defaultOpen }),
  );
  const isChromeTitle = titleTone === "chrome";

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    setOpen(event.currentTarget.open);
  }

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

  const titleClassName = isChromeTitle
    ? "inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-zinc-600"
    : "inline-flex min-w-0 items-center gap-1.5";

  const titleNode = isChromeTitle ? (
    <h3 id={headingId} className={titleClassName}>
      {titleRow}
    </h3>
  ) : (
    <SectionHeading id={headingId} className={titleClassName}>
      {titleRow}
    </SectionHeading>
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
          {titleNode}
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

  const detailsBody = shouldRenderCollapsibleBody(open)
    ? inset
      ? <div className="px-4 pb-4">{body}</div>
      : body
    : null;

  const details = (
    <details className="group" open={open} onToggle={handleToggle}>
      <summary className={summaryClassName}>
        {isChromeTitle ? (
          <h3 id={headingId} className={titleClassName}>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-90"
              aria-hidden
            />
            {titleRow}
          </h3>
        ) : (
          <SectionHeading id={headingId} className={titleClassName}>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-90"
              aria-hidden
            />
            {titleRow}
          </SectionHeading>
        )}
        {titleAside ? <span className="contents group-open:hidden">{titleAside}</span> : null}
      </summary>
      {detailsBody}
    </details>
  );

  if (!inset) {
    return <section className={className}>{details}</section>;
  }

  return <PanelInset className={["overflow-hidden p-0", className].filter(Boolean).join(" ")}>{details}</PanelInset>;
}

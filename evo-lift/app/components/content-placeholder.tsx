import {
  CONTENT_PLACEHOLDER_ROW_CLASS,
  CONTENT_PLACEHOLDER_SURFACE_CLASS,
  contentPlaceholderIndexes,
} from "@/app/components/content-placeholder-layout";

type ContentPlaceholderProps = {
  /** Visually hidden status for assistive tech. Omit on a follow-up block that shares a label. */
  label?: string;
  /** Muted bars. One bar is a chart or panel. Several bars are a list. */
  rows?: number;
  /** Height classes for each bar. */
  rowClassName?: string;
  /** Replaces the default vertical stack, for example a KPI grid. */
  barsClassName?: string;
  className?: string;
};

export function ContentPlaceholder({
  label,
  rows = 1,
  rowClassName = CONTENT_PLACEHOLDER_ROW_CLASS,
  barsClassName,
  className,
}: ContentPlaceholderProps) {
  const indexes = contentPlaceholderIndexes(rows);
  const bars = (
    <div aria-hidden className={barsClassName ?? (indexes.length > 1 ? "space-y-2" : undefined)}>
      {indexes.map((index) => (
        <div key={index} className={`${CONTENT_PLACEHOLDER_SURFACE_CLASS} ${rowClassName}`} />
      ))}
    </div>
  );

  if (!label) {
    return bars;
  }

  return (
    <div className={className} aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      {bars}
    </div>
  );
}

type EvoLiftMarkProps = {
  className?: string;
};

/** Plate mark. Use when the EvoLift name is already visible or should stay hidden. */
export function EvoLiftMark({ className }: EvoLiftMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      <rect width="64" height="64" rx="18" fill="#38bdf8" />
      <g fill="#0c4a6e">
        <rect x="11.5" y="25.5" width="5" height="13" rx="2" />
        <rect x="18" y="20.5" width="6" height="23" rx="2.4" />
        <rect x="22.5" y="29.5" width="19" height="5" rx="1.5" />
        <rect x="40" y="20.5" width="6" height="23" rx="2.4" />
        <rect x="47.5" y="25.5" width="5" height="13" rx="2" />
      </g>
    </svg>
  );
}

type EvoLiftBrandProps = {
  className?: string;
  markClassName?: string;
  titleClassName?: string;
};

/** Plate mark + wordmark. Use when the name should sit with the mark. */
export function EvoLiftBrand({
  className = "",
  markClassName = "h-8 w-8",
  titleClassName = "text-lg leading-none font-bold tracking-[-0.04em] text-sky-900",
}: EvoLiftBrandProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <EvoLiftMark className={`shrink-0 ${markClassName}`.trim()} />
      <span className={titleClassName}>EvoLift</span>
    </div>
  );
}

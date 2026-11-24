import { proseLinkClassName } from "@/app/components/inline-link-class";
import { EXRX_STANDARDS_URL } from "@/lib/strength-standards";

const SOURCE_NAME = "ExRx.net";

export function StrengthStandardsSource({ source, className }: { source: string; className?: string }) {
  const index = source.indexOf(SOURCE_NAME);
  const classNames = ["text-xs text-zinc-600", className].filter(Boolean).join(" ");
  if (index < 0) {
    return <p className={classNames}>{source}</p>;
  }
  return (
    <p className={classNames}>
      {source.slice(0, index)}
      <a href={EXRX_STANDARDS_URL} className={proseLinkClassName} target="_blank" rel="noreferrer">
        {SOURCE_NAME}
      </a>
      {source.slice(index + SOURCE_NAME.length)}
    </p>
  );
}

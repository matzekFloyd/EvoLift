import { proseLinkClassName } from "@/app/components/inline-link-class";

const SOURCE_NAME = "ExRx.net";
const SOURCE_HREF = "https://exrx.net";

export function StrengthStandardsSource({ source, className }: { source: string; className?: string }) {
  const index = source.indexOf(SOURCE_NAME);
  const classNames = ["text-xs text-zinc-600", className].filter(Boolean).join(" ");
  if (index < 0) {
    return <p className={classNames}>{source}</p>;
  }
  return (
    <p className={classNames}>
      {source.slice(0, index)}
      <a href={SOURCE_HREF} className={proseLinkClassName} target="_blank" rel="noreferrer">
        {SOURCE_NAME}
      </a>
      {source.slice(index + SOURCE_NAME.length)}
    </p>
  );
}

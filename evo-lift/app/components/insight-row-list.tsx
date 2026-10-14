import Link from "next/link";
import { StatusBadge } from "@/app/components/status-badge";
import { type InsightRow } from "@/app/components/insight-rows";

export type { InsightRow } from "@/app/components/insight-rows";
export {
  comparisonInsightRow,
  progressInsightRow,
  progressReadBadgeTone,
} from "@/app/components/insight-rows";

const EXRX_TABLE_PHRASE = "ExRx table";

export function TextWithExRxTableLink({ text, href }: { text: string; href: string | null }) {
  if (!href) {
    return <>{text}</>;
  }
  const index = text.indexOf(EXRX_TABLE_PHRASE);
  if (index < 0) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, index)}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-sky-800"
      >
        {EXRX_TABLE_PHRASE}
      </a>
      {text.slice(index + EXRX_TABLE_PHRASE.length)}
    </>
  );
}

export function InsightRowList({ rows }: { rows: InsightRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
      {rows.map((row) => (
        <li key={row.id} className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {row.href ? (
                <Link
                  href={row.href}
                  className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
                >
                  {row.title}
                </Link>
              ) : (
                <p className="text-sm font-medium text-zinc-900">{row.title}</p>
              )}
              <p className="mt-1 text-xs text-zinc-700">
                <TextWithExRxTableLink text={row.detail} href={row.tableHref} />
              </p>
              {row.meta ? <p className="mt-0.5 text-xs text-zinc-500">{row.meta}</p> : null}
            </div>
            <StatusBadge tone={row.badgeTone} description={row.badgeDescription}>
              {row.badge}
            </StatusBadge>
          </div>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/app/components/status-badge";
import { estimateChangeMark, type InsightRow } from "@/app/components/insight-rows";

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

function EstimateLead({ meta }: { meta: string }) {
  const mark = estimateChangeMark(meta);
  if (!mark) {
    return <p className="text-sm font-medium tabular-nums text-zinc-900">{meta}</p>;
  }
  const Icon = mark.direction === "down" ? ArrowDown : ArrowUp;
  return (
    <p className="text-sm font-medium tabular-nums text-zinc-900">
      {mark.lead}{" "}
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="sr-only">{mark.direction === "down" ? "Down" : "Up"} </span>
        {mark.amount}
      </span>
    </p>
  );
}

function insightRowCopy(row: InsightRow): { first: ReactNode; rest: ReactNode } {
  if (row.title) {
    return {
      first: row.href ? (
        <Link
          href={row.href}
          className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
        >
          {row.title}
        </Link>
      ) : (
        <p className="text-sm font-medium text-zinc-900">{row.title}</p>
      ),
      rest: (
        <>
          <p className="text-xs text-zinc-700">
            <TextWithExRxTableLink text={row.detail} href={row.tableHref} />
          </p>
          {row.meta ? <p className="mt-0.5 text-xs text-zinc-500">{row.meta}</p> : null}
        </>
      ),
    };
  }
  if (row.quiet) {
    return {
      first: row.meta ? <p className="text-sm text-zinc-700">{row.meta}</p> : null,
      rest: row.detail ? (
        <p className="text-xs text-zinc-600">
          <TextWithExRxTableLink text={row.detail} href={row.tableHref} />
        </p>
      ) : null,
    };
  }
  return {
    first: row.meta ? <EstimateLead meta={row.meta} /> : null,
    rest: row.detail ? (
      <p className="text-xs text-zinc-700">
        <TextWithExRxTableLink text={row.detail} href={row.tableHref} />
      </p>
    ) : null,
  };
}

export function InsightRowList({ rows }: { rows: InsightRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <ul className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3">
      {rows.map((row) => {
        const { first, rest } = insightRowCopy(row);
        return (
          <li
            key={row.id}
            className="col-span-2 grid grid-cols-subgrid items-center gap-y-1 px-3 py-2.5"
          >
            <div className="col-start-2 row-start-1 min-w-0 sm:col-start-1">{first}</div>
            {rest ? <div className="col-start-2 min-w-0 sm:col-start-1">{rest}</div> : null}
            <StatusBadge
              tone={row.badgeTone}
              description={row.badgeDescription}
              className="col-start-1 row-start-1 w-full justify-center sm:col-start-2"
            >
              {row.badge}
            </StatusBadge>
          </li>
        );
      })}
    </ul>
  );
}

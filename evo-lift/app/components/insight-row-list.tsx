import Link from "next/link";
import type { ReactNode } from "react";
import { ChangeMark } from "@/app/components/change-mark";
import { ExerciseName } from "@/app/components/exercise-badge-chip";
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

function EstimateLead({ meta, subordinate = false }: { meta: string; subordinate?: boolean }) {
  const mark = estimateChangeMark(meta);
  if (!mark) {
    return (
      <p
        className={
          subordinate
            ? "text-xs font-normal tabular-nums text-zinc-600"
            : "text-sm font-medium tabular-nums text-zinc-900"
        }
      >
        {meta}
      </p>
    );
  }
  return (
    <p className="text-sm font-medium tabular-nums text-zinc-900">
      {mark.lead}{" "}
      <ChangeMark
        direction={mark.direction}
        amount={mark.amount}
        label={mark.direction === "down" ? "Down" : "Up"}
      />
      {mark.suffix}
    </p>
  );
}

function insightRowCopy(row: InsightRow): { first: ReactNode; rest: ReactNode } {
  if (row.title) {
    return {
      first: (
        <div className="min-w-0">
          <ExerciseName slug={row.slug}>
            {row.href ? (
              <Link
                href={row.href}
                className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
              >
                {row.title}
              </Link>
            ) : (
              <span className="text-sm font-medium text-zinc-900">{row.title}</span>
            )}
          </ExerciseName>
          {row.meta ? (
            <div className="mt-0.5">
              <EstimateLead meta={row.meta} subordinate />
            </div>
          ) : null}
        </div>
      ),
      rest: row.detail ? (
        <p className="text-xs text-zinc-600">
          <TextWithExRxTableLink text={row.detail} href={row.tableHref} />
        </p>
      ) : null,
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
    <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
      {rows.map((row) => {
        const { first, rest } = insightRowCopy(row);
        return (
          <li key={row.id} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-x-3">
              <div className="min-w-0 flex-1">{first}</div>
              <StatusBadge tone={row.badgeTone} description={row.badgeDescription}>
                {row.badge}
              </StatusBadge>
            </div>
            {rest ? <div className="mt-1">{rest}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}

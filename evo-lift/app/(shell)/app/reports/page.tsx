"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { AppTable, appTableHeadRowClassName, appTableTdClassName, appTableThClassName } from "@/app/components/app-table";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { PageShell } from "@/app/components/page-shell";
import { StatusNotice } from "@/app/components/status-notice";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import {
  REPORT_PAUSED_MESSAGE,
  readReportSummary,
  reportCooldownMessage,
  reportNextCreateAt,
  reportParagraphs,
  reportReadingParagraphs,
  type ReportKind,
  type ReportSummary,
} from "@/lib/training-report";
import { SESSION_TOKEN_HEADER } from "@/lib/session-token-header";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";

type TrainingReport = {
  id: string;
  period_start: string;
  period_end: string;
  report_text: string;
  created_at: string;
};

function ReportParagraph({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-sm text-zinc-800">
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

function ReportPace({ summary }: { summary: ReportSummary }) {
  const weekly = summary.pace?.replace(/ sessions a week$/, "");
  return (
    <p className="text-sm text-zinc-800">
      {weekly ? `${summary.sessions} sessions, ${weekly} a week` : `${summary.sessions} sessions`}
    </p>
  );
}

function ReportFigures({ summary }: { summary: ReportSummary }) {
  return (
    <div className="grid gap-5">
      <ReportPace summary={summary} />
      {summary.lifts.length > 0 ? (
        <section>
          <h3 className="text-sm font-medium text-zinc-800">Lifts</h3>
          <div className="mt-2">
            {summary.kind === "all" ? <AllLiftsTable summary={summary} /> : <RecentLiftsTable summary={summary} />}
          </div>
        </section>
      ) : null}
      <ReportNotes lines={[...summary.skipped, ...summary.watch, ...summary.notes]} />
    </div>
  );
}

function changeClassName(direction: ReportSummary["lifts"][number]["direction"]): string {
  if (direction === "up") {
    return "font-medium text-emerald-700";
  }
  if (direction === "down") {
    return "font-medium text-red-700";
  }
  return "";
}

function LiftName({ name }: { name: string }) {
  return (
    <th className={`${appTableTdClassName} text-left font-medium text-zinc-900`} scope="row">
      {name}
    </th>
  );
}

function RecentLiftsTable({ summary }: { summary: ReportSummary }) {
  return (
    <AppTable>
      <caption className="sr-only">Earlier load, latest load, and change for the lifts in this report</caption>
      <thead>
        <tr className={appTableHeadRowClassName}>
          <th className={appTableThClassName} scope="col">Lift</th>
          <th className={appTableThClassName} scope="col">Earlier</th>
          <th className={appTableThClassName} scope="col">Latest</th>
          <th className={appTableThClassName} scope="col">Change</th>
        </tr>
      </thead>
      <tbody>
        {summary.lifts.map((lift) => (
          <tr key={lift.name}>
            <LiftName name={lift.name} />
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums`}>{lift.earlier}</td>
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums`}>{lift.latest}</td>
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums ${changeClassName(lift.direction)}`}>{lift.change}</td>
          </tr>
        ))}
      </tbody>
    </AppTable>
  );
}

function AllLiftsTable({ summary }: { summary: ReportSummary }) {
  return (
    <AppTable>
      <caption className="sr-only">
        Sessions, estimated 1RM, change, and best set for the lifts in this report
      </caption>
      <thead>
        <tr className={appTableHeadRowClassName}>
          <th className={appTableThClassName} scope="col">Lift</th>
          <th className={appTableThClassName} scope="col">Sessions</th>
          <th className={appTableThClassName} scope="col">First est. 1RM</th>
          <th className={appTableThClassName} scope="col">Latest est. 1RM</th>
          <th className={appTableThClassName} scope="col">Change</th>
          <th className={appTableThClassName} scope="col">Best set</th>
        </tr>
      </thead>
      <tbody>
        {summary.lifts.map((lift) => (
          <tr key={lift.name}>
            <LiftName name={lift.name} />
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums`}>{lift.logged ?? ""}</td>
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums`}>{lift.earlier}</td>
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums`}>{lift.latest}</td>
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums ${changeClassName(lift.direction)}`}>{lift.change}</td>
            <td className={`${appTableTdClassName} whitespace-nowrap tabular-nums`}>{lift.heaviest ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </AppTable>
  );
}

function ReportNotes({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <ul className="grid gap-1 text-sm text-zinc-800">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function ReportView({ text }: { text: string }) {
  const { prose, summary } = readReportSummary(text);
  const paragraphs = reportParagraphs(prose);
  const reading = summary ? reportReadingParagraphs(paragraphs) : paragraphs;
  const medical = summary
    ? paragraphs.filter((paragraph) => paragraph.toLowerCase().includes("not medical advice"))
    : [];
  return (
    <div className="grid gap-5">
      {summary ? <ReportFigures summary={summary} /> : null}
      {reading.length > 0 ? (
        <div className="grid gap-3">
          {reading.map((paragraph, index) => (
            <ReportParagraph key={index} text={paragraph} />
          ))}
        </div>
      ) : null}
      {medical.length > 0 ? (
        <div className="grid gap-3">
          {medical.map((paragraph, index) => (
            <ReportParagraph key={index} text={paragraph} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function reportScopeLabel(text: string): string {
  return readReportSummary(text).summary?.kind === "all" ? "All sessions" : "Last 4 weeks";
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sessionAuthHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    [SESSION_TOKEN_HEADER]: token,
  };
}

function periodLabel(report: TrainingReport): string {
  return `${formatDateOnlyForLocale(report.period_start)} – ${formatDateOnlyForLocale(report.period_end)}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [creatingKind, setCreatingKind] = useState<ReportKind | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [reports, setReports] = useState<TrainingReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allowancePaused, setAllowancePaused] = useState(false);

  const loadReports = useCallback(async (token: string) => {
    const response = await fetch("/api/reports", {
      credentials: "same-origin",
      headers: sessionAuthHeaders(token),
    });
    const body = (await response.json().catch(() => null)) as {
      data?: TrainingReport[];
      allowancePaused?: boolean;
      error?: string;
    } | null;
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (!response.ok || !body?.data) {
      setErrorMessage(body?.error || "Could not load reports.");
      return;
    }
    setReports(body.data);
    setAllowancePaused(body.allowancePaused === true);
    setSelectedId((current) => current ?? body.data?.[0]?.id ?? null);
  }, [router]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await getBrowserAuthSession();
      if (!active) {
        return;
      }
      if (!session) {
        router.replace("/login");
        return;
      }
      setAccessToken(session.access_token);
      await loadReports(session.access_token);
      if (active) {
        setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadReports, router]);

  async function createReport(kind: ReportKind) {
    if (creatingKind) {
      return;
    }
    const session = await getBrowserAuthSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setAccessToken(session.access_token);
    setCreatingKind(kind);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          ...sessionAuthHeaders(session.access_token),
          "content-type": "application/json",
        },
        body: JSON.stringify({ today: getTodayYyyyMmDd(), kind }),
      });
      const body = (await response.json().catch(() => null)) as {
        data?: TrainingReport;
        error?: string;
      } | null;
      if (!response.ok || !body?.data) {
        if (body?.error === REPORT_PAUSED_MESSAGE) {
          setAllowancePaused(true);
        }
        setErrorMessage(body?.error || "The report could not be created. Try again.");
        return;
      }
      setReports((current) => [body.data as TrainingReport, ...current.filter((report) => report.id !== body.data?.id)]);
      setSelectedId(body.data.id);
    } catch {
      setErrorMessage("The report could not be created. Try again.");
    } finally {
      setCreatingKind(null);
    }
  }

  const selected = reports.find((report) => report.id === selectedId) ?? null;
  const now = new Date();
  const recentAvailableAt = allowancePaused ? null : reportNextCreateAt(reports, "recent", now);
  const allAvailableAt = allowancePaused ? null : reportNextCreateAt(reports, "all", now);
  const createStatus = allowancePaused
    ? [REPORT_PAUSED_MESSAGE]
    : [allAvailableAt ? reportCooldownMessage("all", allAvailableAt) : null, recentAvailableAt ? reportCooldownMessage("recent", recentAvailableAt) : null].filter(
        (line): line is string => line != null,
      );

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Notes are sent to the model provider to write the report.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <ActionButton
            type="button"
            variant="secondary"
            onClick={() => void createReport("all")}
            disabled={creatingKind != null || isLoading || allowancePaused || allAvailableAt != null}
            aria-describedby={createStatus.length > 0 ? "report-create-status" : undefined}
          >
            {creatingKind === "all" ? "Creating report..." : "Create all-sessions report"}
          </ActionButton>
          <ActionButton
            type="button"
            variant="primary"
            onClick={() => void createReport("recent")}
            disabled={creatingKind != null || isLoading || allowancePaused || recentAvailableAt != null}
            aria-describedby={createStatus.length > 0 ? "report-create-status" : undefined}
          >
            {creatingKind === "recent" ? "Creating report..." : "Create 4-week report"}
          </ActionButton>
        </div>
        {createStatus.length > 0 ? (
          <p id="report-create-status" className="mt-2 text-right text-sm text-zinc-600">
            {createStatus.join(" ")}
          </p>
        ) : null}
      </header>
      {errorMessage ? (
        <StatusNotice message={errorMessage} tone="error" onDismiss={() => setErrorMessage(null)} className="mt-4" />
      ) : null}

      {isLoading ? (
        <ContentPlaceholder label="Loading reports..." className="mt-4" />
      ) : reports.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No reports yet.</p>
      ) : (
        <section className="panel mt-4 grid gap-5 p-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0">
            <h2 className="text-base font-medium text-zinc-800">Saved reports</h2>
            <ul className="mt-2 grid max-h-64 gap-0.5 overflow-y-auto lg:max-h-[28rem]">
              {reports.map((report) => {
                const selectedReport = report.id === selected?.id;
                return (
                  <li key={report.id}>
                    <button
                      type="button"
                      aria-pressed={selectedReport}
                      onClick={() => setSelectedId(report.id)}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                        selectedReport ? "bg-sky-50 text-zinc-900" : "text-zinc-800 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="font-medium">{reportScopeLabel(report.report_text)}</span>
                      <span className="mt-0.5 block text-zinc-500">{formatCreatedAt(report.created_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {selected ? (
            <article className="min-w-0">
              <p className="text-sm text-zinc-500">
                {reportScopeLabel(selected.report_text)}, {periodLabel(selected)}
              </p>
              <ReportView text={selected.report_text} />
            </article>
          ) : null}
        </section>
      )}
    </PageShell>
  );
}

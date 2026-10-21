"use client";

import { FileStack, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import {
  AppTable,
  AppTableActionsHeader,
  appTableHeadRowClassName,
  appTableRowClassName,
  appTableTdClassName,
  appTableThClassName,
} from "@/app/components/app-table";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { NAMED_LIST_PLACEHOLDER_ROWS } from "@/app/components/content-placeholder-layout";
import { PageAddAction } from "@/app/components/page-add-action";
import { DateInput } from "@/app/components/date-input";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import {
  TableRowActions,
  tableRowActionLinkClassName,
} from "@/app/components/table-row-actions";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { invalidateTemplatesList, loadTemplatesList, peekTemplatesList, templatesListEpoch } from "@/lib/templates-list-cache";
import {
  sortRowsByName,
  toggleNamedListSortDirection,
  type NamedListSortDirection,
} from "@/lib/named-list-sort";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { deleteUserTemplate, instantiateUserTemplate } from "@/server/actions/templates";
import type { WorkoutTemplateListItem } from "@/server/db/templates";

export default function TemplatesPage() {
  const router = useRouter();
  const [cachedTemplates] = useState(() => {
    const userId = rememberedUserId();
    return userId ? peekTemplatesList(userId) : null;
  });
  const [isChecking, setIsChecking] = useState(cachedTemplates == null);
  const [templates, setTemplates] = useState<WorkoutTemplateListItem[]>(cachedTemplates ?? []);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [useDialogTemplateId, setUseDialogTemplateId] = useState<string | null>(null);
  const [usePerformedOn, setUsePerformedOn] = useState(getTodayYyyyMmDd);
  const [useSessionNotes, setUseSessionNotes] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameSortDirection, setNameSortDirection] = useState<NamedListSortDirection>("asc");

  const sortedTemplates = useMemo(
    () => sortRowsByName(templates, nameSortDirection),
    [nameSortDirection, templates],
  );

  function showError(text: string) {
    setMessageTone("error");
    setMessage(text);
  }

  function clearMessage() {
    setMessage(null);
  }

  async function reloadTemplates() {
    const currentUserId = rememberedUserId();
    if (!currentUserId) {
      setLoadError("You must be logged in.");
      return;
    }
    invalidateTemplatesList();
    const started = templatesListEpoch();
    const result = await loadTemplatesList(supabaseBrowserClient, currentUserId, { fresh: true });
    if (started !== templatesListEpoch()) {
      return;
    }
    if (result.error) {
      setLoadError(result.error);
      return;
    }
    setTemplates(result.rows);
    setLoadError(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const started = templatesListEpoch();
      const visit = await confirmSignedInUser();
      if (!isMounted || started !== templatesListEpoch()) {
        return;
      }
      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }
      if (!visit.showCached) {
        setTemplates([]);
        setIsChecking(true);
      }
      const result = await loadTemplatesList(supabaseBrowserClient, visit.userId, {
        fresh: visit.showCached,
      });
      if (!isMounted || started !== templatesListEpoch()) {
        return;
      }
      if (result.error) {
        if (!visit.showCached) {
          setLoadError(result.error);
        }
        setIsChecking(false);
        return;
      }
      setTemplates(result.rows);
      setLoadError(null);
      setIsChecking(false);
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, [router]);

  function openUseDialog(templateId: string) {
    setUseDialogTemplateId(templateId);
    setUsePerformedOn(getTodayYyyyMmDd());
    setUseSessionNotes("");
    clearMessage();
  }

  async function confirmUseTemplate() {
    if (!useDialogTemplateId || !usePerformedOn) {
      showError("Please choose a performed date.");
      return;
    }
    const session = await getBrowserAuthSession();
    if (!session?.access_token) {
      showError("You must be logged in.");
      return;
    }
    setIsStartingSession(true);
    clearMessage();
    try {
      const sessionId = await instantiateUserTemplate({
        accessToken: session.access_token,
        templateId: useDialogTemplateId,
        performedOn: usePerformedOn,
        notes: useSessionNotes.trim() ? useSessionNotes.trim() : null,
      });
      invalidateLoggedHistoryCaches();
      setUseDialogTemplateId(null);
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not start session.");
    } finally {
      setIsStartingSession(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTargetId) {
      return;
    }
    const session = await getBrowserAuthSession();
    if (!session?.access_token) {
      showError("You must be logged in.");
      return;
    }
    setIsDeleting(true);
    clearMessage();
    try {
      await deleteUserTemplate(session.access_token, deleteTargetId);
      setDeleteTargetId(null);
      await reloadTemplates();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not delete template.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileStack className="h-6 w-6 text-sky-700" />
          Templates
        </h1>
        <PageAddAction href="/templates/new" label="Create template" />
      </div>

      <section className="panel p-5">
        <p className="text-sm text-zinc-600">
          Save a reusable exercise list with targets. Use a template to start a logged workout session
          in one step, or prefill a planned session from{" "}
          <Link href="/sessions/new" className="font-medium text-sky-800 underline-offset-2 hover:underline">
            New workout session
          </Link>
          .
        </p>

        {message ? (
          <StatusNotice
            message={message}
            tone={messageTone}
            onDismiss={clearMessage}
            className="mt-4"
          />
        ) : null}

        {isChecking ? (
          <ContentPlaceholder
            label="Checking session..."
            rows={NAMED_LIST_PLACEHOLDER_ROWS}
            className="mt-4"
          />
        ) : loadError ? (
          <p className="mt-4 text-sm text-red-600">{loadError}</p>
        ) : templates.length === 0 ? (
          <p className="mt-4 text-center text-sm text-zinc-600">No templates yet.</p>
        ) : (
          <AppTable className="mt-4">
            <thead>
              <tr className={appTableHeadRowClassName}>
                <th className={appTableThClassName}>
                  <button
                    type="button"
                    onClick={() =>
                      setNameSortDirection((prev) => toggleNamedListSortDirection(prev))
                    }
                    className="inline-flex items-center gap-1"
                  >
                    Name <span>{nameSortDirection === "asc" ? "↑" : "↓"}</span>
                  </button>
                </th>
                <th className={`${appTableThClassName} w-14 whitespace-nowrap sm:w-24`}>
                  <span className="sm:hidden">Ex.</span>
                  <span className="hidden sm:inline">Exercises</span>
                </th>
                <AppTableActionsHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedTemplates.map((row) => (
                <tr key={row.id} className={appTableRowClassName}>
                  <td
                    className={`${appTableTdClassName} break-words whitespace-normal font-medium text-zinc-900`}
                  >
                    {row.name}
                  </td>
                  <td className={`${appTableTdClassName} text-zinc-600`}>{row.exerciseCount}</td>
                  <td className={appTableTdClassName}>
                    <TableRowActions stackUntil="md">
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => openUseDialog(row.id)}
                      >
                        <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Use
                      </ActionButton>
                      <Link
                        href={`/templates/${row.id}/edit`}
                        className={tableRowActionLinkClassName}
                      >
                        <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Edit
                      </Link>
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteTargetId(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Delete
                      </ActionButton>
                    </TableRowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </AppTable>
        )}
      </section>

      {useDialogTemplateId ? (
        <AppDialog titleId="use-template-title" onClose={() => setUseDialogTemplateId(null)}>
          <SectionHeading id="use-template-title">Start session from template</SectionHeading>
          <p className="mt-1 text-xs text-zinc-600">
            Creates a workout session with this template&apos;s exercises and targets. You can
            still edit before logging sets.
          </p>
          <label className="mt-4 block text-sm font-medium text-zinc-800">
            Performed on
            <DateInput
              required
              value={usePerformedOn}
              onChange={(e) => setUsePerformedOn(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-zinc-800">
            Session notes (optional)
            <textarea
              value={useSessionNotes}
              onChange={(e) => setUseSessionNotes(e.target.value)}
              className="mt-1 h-20 w-full rounded-md border px-3 py-2 text-sm"
              maxLength={500}
              placeholder="Optional notes for this session"
            />
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setUseDialogTemplateId(null)}
              className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isStartingSession}
              onClick={() => void confirmUseTemplate()}
              className="rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
            >
              {isStartingSession ? "Starting…" : "Start session"}
            </button>
          </div>
        </AppDialog>
      ) : null}

      {deleteTargetId ? (
        <AppDialog
          titleId="delete-template-title"
          panelClassName="max-w-sm"
          onClose={() => setDeleteTargetId(null)}
        >
          <SectionHeading id="delete-template-title">Delete template?</SectionHeading>
          <p className="mt-1 text-sm text-zinc-600">
            This removes the template only. Existing workout sessions stay unchanged.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTargetId(null)}
              className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
              className="rounded-md border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white hover:border-red-700 hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </AppDialog>
      ) : null}
    </PageShell>
  );
}

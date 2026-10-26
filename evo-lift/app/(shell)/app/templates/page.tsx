"use client";

import { Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import { NamedListTable, NamedListTableRow } from "@/app/components/named-list-table";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { NAMED_LIST_PLACEHOLDER_ROWS } from "@/app/components/content-placeholder-layout";
import { PageAddAction } from "@/app/components/page-add-action";
import { appPath } from "@/lib/app-paths";
import { DateInput } from "@/app/components/date-input";
import { NotesTextareaField } from "@/app/components/notes-textarea-field";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { invalidateTemplatesList, loadTemplatesList, peekTemplatesList, templatesListEpoch } from "@/lib/templates-list-cache";
import { toggleNamedListSortDirection } from "@/lib/named-list-sort";
import {
  sortTemplateListRows,
  TEMPLATE_LIST_EMPTY_ACTION,
  TEMPLATE_LIST_EMPTY_LEAD,
  TEMPLATE_LIST_EMPTY_TAIL,
  templateEditHref,
  templateExerciseCountLabel,
  type TemplateListSort,
} from "./template-list";
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
  const [sort, setSort] = useState<TemplateListSort>({ key: "name", direction: "asc" });

  const sortedTemplates = useMemo(() => sortTemplateListRows(templates, sort), [sort, templates]);

  function toggleSort(key: TemplateListSort["key"]) {
    setSort((current) =>
      current.key === key
        ? { key, direction: toggleNamedListSortDirection(current.direction) }
        : { key, direction: "asc" },
    );
  }

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
      router.push(appPath(`/sessions/${sessionId}`));
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
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <PageAddAction href={appPath("/templates/new")} label="Create template" />
      </div>

      <section className="panel p-5">
        <p className="text-sm text-zinc-600">
          Save a reusable exercise list with targets. Use a template to start a logged workout session
          in one step, or prefill a planned session from{" "}
          <Link href={appPath("/sessions/new")} className="font-medium text-sky-800 underline-offset-2 hover:underline">
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
          <StatusNotice className="mt-4" message={loadError} tone="error" />
        ) : templates.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            {TEMPLATE_LIST_EMPTY_LEAD}{" "}
            <Link
              href={appPath("/templates/new")}
              className="font-medium text-sky-800 underline-offset-2 hover:underline"
            >
              {TEMPLATE_LIST_EMPTY_ACTION}
            </Link>{" "}
            {TEMPLATE_LIST_EMPTY_TAIL}
          </p>
        ) : (
          <NamedListTable
            className="mt-4"
            sortDirection={sort.direction}
            nameSortActive={sort.key === "name"}
            onToggleSort={() => toggleSort("name")}
            countSort={{
              label: "Exercises",
              active: sort.key === "exercises",
              direction: sort.direction,
              onToggle: () => toggleSort("exercises"),
              tracks: "count",
            }}
            embedActions
          >
            {sortedTemplates.map((row) => (
              <NamedListTableRow
                key={row.id}
                name={row.name}
                href={templateEditHref(row.id)}
                detailInline
                detail={
                  <p className="justify-self-end text-sm whitespace-nowrap text-zinc-600 md:justify-self-start">
                    {templateExerciseCountLabel(row.exerciseCount)}
                  </p>
                }
              >
                <ActionButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openUseDialog(row.id)}
                >
                  <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Use
                </ActionButton>
                <ActionButton
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteTargetId(row.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Delete
                </ActionButton>
              </NamedListTableRow>
            ))}
          </NamedListTable>
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
          <div className="mt-3">
            <NotesTextareaField
              label="Session notes (optional)"
              value={useSessionNotes}
              onChange={setUseSessionNotes}
              maxLength={500}
              heightClassName="h-20"
              placeholder="Optional notes for this session"
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <ActionButton type="button" variant="secondary" size="md" onClick={() => setUseDialogTemplateId(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              variant="primary"
              size="md"
              disabled={isStartingSession}
              onClick={() => void confirmUseTemplate()}
            >
              {isStartingSession ? "Starting…" : "Start session"}
            </ActionButton>
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
            <ActionButton type="button" variant="secondary" size="md" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              variant="danger"
              size="md"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </ActionButton>
          </div>
        </AppDialog>
      ) : null}
    </PageShell>
  );
}

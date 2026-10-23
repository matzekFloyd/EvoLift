"use client";

import { CircleCheck, CircleOff, Copy, ListOrdered, Trash2 } from "lucide-react";
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
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import {
  PLAN_LIST_EMPTY_ACTION,
  PLAN_LIST_EMPTY_LEAD,
  PLAN_LIST_EMPTY_TAIL,
  PLAN_LIST_INTRO,
  planEditHref,
  planListStatusLabel,
  sortPlanListRows,
} from "./plan-list";
import {
  toggleNamedListSortDirection,
  type NamedListSortDirection,
} from "@/lib/named-list-sort";
import { invalidatePlansList, loadPlansList, peekPlansList, plansListEpoch } from "@/lib/plans-list-cache";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { deleteUserPlan, duplicateUserPlan, setUserPlanActive } from "@/server/actions/plans";

type PlanListRow = {
  id: string;
  name: string;
  isActive: boolean;
  dayCount: number;
};

export default function PlansPage() {
  const router = useRouter();
  const [cachedPlans] = useState(() => {
    const userId = rememberedUserId();
    return userId ? peekPlansList(userId) : null;
  });
  const [isChecking, setIsChecking] = useState(cachedPlans == null);
  const [plans, setPlans] = useState<PlanListRow[]>(cachedPlans ?? []);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [nameSortDirection, setNameSortDirection] = useState<NamedListSortDirection>("asc");

  const sortedPlans = useMemo(
    () => sortPlanListRows(plans, nameSortDirection),
    [nameSortDirection, plans],
  );

  async function reloadPlans() {
    const currentUserId = rememberedUserId();
    if (!currentUserId) {
      setLoadError("You must be logged in.");
      return;
    }
    invalidatePlansList();
    const started = plansListEpoch();
    const result = await loadPlansList(supabaseBrowserClient, currentUserId, { fresh: true });
    if (started !== plansListEpoch()) {
      return;
    }
    if (result.error) {
      setLoadError(result.error);
      return;
    }
    setPlans(result.rows);
    setLoadError(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const started = plansListEpoch();
      const visit = await confirmSignedInUser();
      if (!isMounted || started !== plansListEpoch()) {
        return;
      }
      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }
      if (!visit.showCached) {
        setPlans([]);
        setIsChecking(true);
      }
      const result = await loadPlansList(supabaseBrowserClient, visit.userId, {
        fresh: visit.showCached,
      });
      if (!isMounted || started !== plansListEpoch()) {
        return;
      }
      if (result.error) {
        if (!visit.showCached) {
          setLoadError(result.error);
        }
        setIsChecking(false);
        return;
      }
      setPlans(result.rows);
      setLoadError(null);
      setIsChecking(false);
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function accessToken(): Promise<string | null> {
    const session = await getBrowserAuthSession();
    return session?.access_token ?? null;
  }

  async function changeActive(planId: string, isActive: boolean) {
    const token = await accessToken();
    if (!token) {
      setActionError("You must be logged in.");
      return;
    }
    setPendingPlanId(planId);
    setActionError(null);
    try {
      await setUserPlanActive({ accessToken: token, planId, isActive });
      await reloadPlans();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update the active plan.");
    } finally {
      setPendingPlanId(null);
    }
  }

  async function duplicate(planId: string) {
    const token = await accessToken();
    if (!token) {
      setActionError("You must be logged in.");
      return;
    }
    setPendingPlanId(planId);
    setActionError(null);
    try {
      await duplicateUserPlan(token, planId);
      await reloadPlans();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not duplicate plan.");
    } finally {
      setPendingPlanId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTargetId) {
      return;
    }
    const token = await accessToken();
    if (!token) {
      setActionError("You must be logged in.");
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteUserPlan(token, deleteTargetId);
      setDeleteTargetId(null);
      await reloadPlans();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete plan.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ListOrdered className="h-6 w-6 text-sky-700" />
          Plans
        </h1>
        <PageAddAction href={appPath("/plans/new")} label="Create plan" />
      </div>

      <section className="panel p-5">
        <p className="text-sm text-zinc-600">{PLAN_LIST_INTRO}</p>

        {actionError ? (
          <StatusNotice
            className="mt-4"
            message={actionError}
            tone="error"
            onDismiss={() => setActionError(null)}
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
        ) : plans.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            {PLAN_LIST_EMPTY_LEAD}{" "}
            <Link
              href={appPath("/plans/new")}
              className="font-medium text-sky-800 underline-offset-2 hover:underline"
            >
              {PLAN_LIST_EMPTY_ACTION}
            </Link>{" "}
            {PLAN_LIST_EMPTY_TAIL}
          </p>
        ) : (
          <NamedListTable
            className="mt-4"
            sortDirection={nameSortDirection}
            onToggleSort={() => setNameSortDirection((prev) => toggleNamedListSortDirection(prev))}
            countHeading="Days"
          >
            {sortedPlans.map((row) => (
              <NamedListTableRow
                key={row.id}
                name={row.name}
                href={planEditHref(row.id)}
                count={row.dayCount}
                statusLabel={planListStatusLabel(row.isActive)}
              >
                <ActionButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  iconColor="sky"
                  disabled={pendingPlanId === row.id}
                  onClick={() => void changeActive(row.id, !row.isActive)}
                >
                  {row.isActive ? (
                    <CircleOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <CircleCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {row.isActive ? "Deactivate" : "Set active"}
                </ActionButton>
                <ActionButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  iconColor="sky"
                  disabled={pendingPlanId === row.id}
                  onClick={() => void duplicate(row.id)}
                >
                  <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Duplicate
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

      {deleteTargetId ? (
        <AppDialog
          titleId="delete-plan-title"
          panelClassName="max-w-sm"
          onClose={() => setDeleteTargetId(null)}
        >
          <SectionHeading id="delete-plan-title">Delete plan?</SectionHeading>
          <p className="mt-1 text-sm text-zinc-600">
            This removes the plan only. Existing workout sessions stay unchanged.
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

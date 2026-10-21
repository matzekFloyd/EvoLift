"use client";

import { CircleCheck, CircleOff, Copy, ListOrdered, Pencil, Trash2 } from "lucide-react";
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
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import {
  TableRowActions,
  tableRowActionLinkClassName,
} from "@/app/components/table-row-actions";
import {
  sortRowsByName,
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
    () => sortRowsByName(plans, nameSortDirection),
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
        <PageAddAction href="/plans/new" label="Create plan" />
      </div>

      <section className="panel p-5">
        <p className="text-sm text-zinc-600">
          A plan is an ordered cycle of days. Each day has its own exercises and targets. One plan
          can be active. Home starts the next session from that plan. Templates stay separate.
        </p>

        {actionError ? <p className="mt-4 text-sm text-red-600">{actionError}</p> : null}

        {isChecking ? (
          <ContentPlaceholder
            label="Checking session..."
            rows={NAMED_LIST_PLACEHOLDER_ROWS}
            className="mt-4"
          />
        ) : loadError ? (
          <p className="mt-4 text-sm text-red-600">{loadError}</p>
        ) : plans.length === 0 ? (
          <p className="mt-4 text-center text-sm text-zinc-600">No plans yet.</p>
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
                <th className={`${appTableThClassName} w-16`}>Days</th>
                <th className={`${appTableThClassName} hidden w-24 sm:table-cell`}>Status</th>
                <AppTableActionsHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedPlans.map((row) => (
                <tr key={row.id} className={appTableRowClassName}>
                  <td
                    className={`${appTableTdClassName} break-words whitespace-normal font-medium text-zinc-900`}
                  >
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {row.name}
                      {row.isActive ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800 sm:hidden">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 sm:hidden">
                          Inactive
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`${appTableTdClassName} text-zinc-600`}>{row.dayCount}</td>
                  <td className={`${appTableTdClassName} hidden text-zinc-600 sm:table-cell`}>
                    {row.isActive ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className={appTableTdClassName}>
                    <TableRowActions stackUntil="md">
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="secondary"
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
                      <Link href={`/plans/${row.id}/edit`} className={tableRowActionLinkClassName}>
                        <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Edit
                      </Link>
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="secondary"
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
                    </TableRowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </AppTable>
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

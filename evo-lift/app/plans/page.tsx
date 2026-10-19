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
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { deleteUserPlan, duplicateUserPlan, setUserPlanActive } from "@/server/actions/plans";

type PlanListRow = {
  id: string;
  name: string;
  isActive: boolean;
  dayCount: number;
};

export default function PlansPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [plans, setPlans] = useState<PlanListRow[]>([]);
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
    const { data, error } = await supabaseBrowserClient
      .from("workout_plans")
      .select("id, name, is_active, workout_plan_days(id)")
      .order("updated_at", { ascending: false });

    if (error) {
      setLoadError("Could not load plans.");
      return;
    }

    setPlans(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        isActive: row.is_active,
        dayCount: row.workout_plan_days?.length ?? 0,
      })),
    );
    setLoadError(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (!session) {
        router.replace("/login");
        return;
      }
      await reloadPlans();
      setIsChecking(false);
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function accessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabaseBrowserClient.auth.getSession();
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

  if (isChecking) {
    return (
      <PageShell className="items-center justify-center">
        <p className="text-sm text-zinc-600">Checking session...</p>
      </PageShell>
    );
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

        {loadError ? (
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
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800 sm:hidden">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 sm:hidden">
                          Inactive
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`${appTableTdClassName} text-zinc-600`}>{row.dayCount}</td>
                  <td className={`${appTableTdClassName} hidden text-zinc-600 sm:table-cell`}>
                    {row.isActive ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
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
                      <Link href={`/plans/${row.id}/edit`} className={tableRowActionLinkClassName}>
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

      {deleteTargetId ? (
        <AppDialog titleId="delete-plan-title" panelClassName="max-w-sm">
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

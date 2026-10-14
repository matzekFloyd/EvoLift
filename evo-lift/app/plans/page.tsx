"use client";

import { Copy, ListOrdered, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageAddAction } from "@/app/components/page-add-action";
import { PageShell } from "@/app/components/page-shell";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
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
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  function showError(text: string) {
    setMessageTone("error");
    setMessage(text);
  }

  function showSuccess(text: string) {
    setMessageTone("success");
    setMessage(text);
  }

  function clearMessage() {
    setMessage(null);
  }

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
      showError("You must be logged in.");
      return;
    }
    setPendingPlanId(planId);
    clearMessage();
    try {
      await setUserPlanActive({ accessToken: token, planId, isActive });
      await reloadPlans();
      showSuccess(isActive ? "This plan is now active." : "No plan is active.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not update the active plan.");
    } finally {
      setPendingPlanId(null);
    }
  }

  async function duplicate(planId: string) {
    const token = await accessToken();
    if (!token) {
      showError("You must be logged in.");
      return;
    }
    setPendingPlanId(planId);
    clearMessage();
    try {
      await duplicateUserPlan(token, planId);
      await reloadPlans();
      showSuccess("Plan duplicated.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not duplicate plan.");
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
      showError("You must be logged in.");
      return;
    }
    setIsDeleting(true);
    clearMessage();
    try {
      await deleteUserPlan(token, deleteTargetId);
      setDeleteTargetId(null);
      await reloadPlans();
      showSuccess("Plan deleted.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not delete plan.");
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
        <PageAddAction href="/sessions/new" label="Add workout session" />
      </div>

      <section className="panel p-5">
        <p className="text-sm text-zinc-600">
          A plan is an ordered cycle of days. Each day has its own exercises and targets. One plan
          can be active. Home starts the next session from that plan. Templates stay separate.
        </p>

        {message ? (
          <StatusNotice
            message={message}
            tone={messageTone}
            onDismiss={clearMessage}
            className="mt-4"
          />
        ) : null}

        {loadError ? (
          <p className="mt-4 text-sm text-red-600">{loadError}</p>
        ) : plans.length === 0 ? (
          <div className="mt-4 text-center text-sm text-zinc-600">
            <p>No plans yet.</p>
            <Link
              href="/plans/new"
              className="mt-4 inline-flex h-10 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 [&_svg]:text-white"
            >
              <Plus className="h-4 w-4 text-white" />
              Create plan
            </Link>
          </div>
        ) : (
          <>
            <PanelInset className="mt-4 overflow-x-auto p-0">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-zinc-600">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {plans.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{row.dayCount}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {row.isActive ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">
                            Active
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={pendingPlanId === row.id}
                            onClick={() => void changeActive(row.id, !row.isActive)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 disabled:opacity-60"
                          >
                            {row.isActive ? "Clear active" : "Set active"}
                          </button>
                          <button
                            type="button"
                            disabled={pendingPlanId === row.id}
                            onClick={() => void duplicate(row.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 disabled:opacity-60"
                          >
                            <Copy className="h-3.5 w-3.5 text-sky-700" />
                            Duplicate
                          </button>
                          <Link
                            href={`/plans/${row.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                          >
                            <Pencil className="h-3.5 w-3.5 text-sky-700" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(row.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:border-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelInset>
            <div className="mt-4 flex justify-end">
              <Link
                href="/plans/new"
                className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 [&_svg]:text-white"
              >
                <Plus className="h-4 w-4 text-white" />
                Create plan
              </Link>
            </div>
          </>
        )}
      </section>

      {deleteTargetId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-plan-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
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
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

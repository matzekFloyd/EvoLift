"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/app/components/page-shell";
import { PlanEditorClient } from "@/app/plans/plan-editor-client";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { getUserPlanById } from "@/server/actions/plans";
import type { WorkoutPlanWithDays } from "@/server/db/plans";

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = typeof params.id === "string" ? params.id : "";
  const [initial, setInitial] = useState<WorkoutPlanWithDays | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const session = await getBrowserAuthSession();
      if (!isMounted) {
        return;
      }
      if (!session?.access_token || !planId) {
        router.replace("/login");
        return;
      }

      try {
        const row = await getUserPlanById(session.access_token, planId);
        if (!isMounted) {
          return;
        }
        if (!row) {
          setError("Plan not found.");
          return;
        }
        setInitial(row);
      } catch {
        if (isMounted) {
          setError("Could not load plan.");
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [router, planId]);

  if (error) {
    return (
      <PageShell className="items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </PageShell>
    );
  }

  if (!initial) {
    return (
      <PageShell className="items-center justify-center">
        <p className="text-sm text-zinc-600">Loading plan...</p>
      </PageShell>
    );
  }

  return <PlanEditorClient mode="edit" planId={planId} initial={initial} />;
}

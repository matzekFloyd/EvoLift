"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { planSummaryText, type PlanInsights } from "@/lib/plan-insights";
import { loadPlanInsights } from "@/lib/plan-insights-load";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { PlanLiftTrends } from "@/app/plans/plan-lift-trend";

export function PlanInsightsPanel({ planId }: { planId: string }) {
  const [insights, setInsights] = useState<PlanInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const session = await getBrowserAuthSession();
      if (!isMounted) {
        return;
      }
      if (!session) {
        setError("You must be logged in.");
        return;
      }
      try {
        const next = await loadPlanInsights(supabaseBrowserClient, session.user.id, planId);
        if (isMounted) {
          setInsights(next);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Could not load plan insights.");
        }
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [planId]);

  return (
    <section className="mt-6 rounded-md border border-zinc-200 bg-white p-3" aria-labelledby="plan-insights-heading">
      <SectionHeading id="plan-insights-heading">Progress</SectionHeading>
      {error ? <StatusNotice className="mt-3" message={error} tone="error" /> : null}
      {!insights && !error ? <p className="mt-3 text-sm text-zinc-600">Loading plan insights.</p> : null}
      {insights ? (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
            {planSummaryText(insights, formatDateOnlyForLocale)}
          </p>
          <PlanLiftTrends lifts={insights.lifts} />
        </>
      ) : null}
    </section>
  );
}

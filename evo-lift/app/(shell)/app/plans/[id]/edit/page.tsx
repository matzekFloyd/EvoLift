"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionLink } from "@/app/components/action-button";
import { EditorHeading } from "@/app/components/editor-chrome";
import { useParams, useRouter } from "next/navigation";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  EDITOR_PLACEHOLDER_CLASS,
  EDITOR_PLACEHOLDER_ROWS,
} from "@/app/components/content-placeholder-layout";
import { PageShell } from "@/app/components/page-shell";
import { StatusNotice } from "@/app/components/status-notice";
import { PlanEditorClient } from "@/app/plans/plan-editor-client";
import { appPath } from "@/lib/app-paths";
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

  const back = (
    <ActionLink href={appPath("/plans")} variant="secondary" size="md">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </ActionLink>
  );

  if (error) {
    return (
      <PageShell>
        <EditorHeading title="Edit plan" back={back} />
        <StatusNotice className="mt-4" message={error} tone="error" />
      </PageShell>
    );
  }

  if (!initial) {
    return (
      <PageShell>
        <EditorHeading title="Edit plan" back={back} />
        <ContentPlaceholder
          label="Loading plan..."
          rows={EDITOR_PLACEHOLDER_ROWS}
          rowClassName={EDITOR_PLACEHOLDER_CLASS}
        />
      </PageShell>
    );
  }

  return <PlanEditorClient mode="edit" planId={planId} initial={initial} />;
}

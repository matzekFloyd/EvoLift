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
import { TemplateEditorClient } from "@/app/templates/template-editor-client";
import { appPath } from "@/lib/app-paths";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { getUserTemplateById } from "@/server/actions/templates";
import type { WorkoutTemplateWithExercises } from "@/server/db/templates";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = typeof params.id === "string" ? params.id : "";
  const [initial, setInitial] = useState<WorkoutTemplateWithExercises | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const session = await getBrowserAuthSession();
      if (!isMounted) {
        return;
      }
      if (!session?.access_token || !templateId) {
        router.replace("/login");
        return;
      }

      try {
        const row = await getUserTemplateById(session.access_token, templateId);
        if (!isMounted) {
          return;
        }
        if (!row) {
          setError("Template not found.");
          return;
        }
        setInitial(row);
      } catch {
        if (isMounted) {
          setError("Could not load template.");
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [router, templateId]);

  const back = (
    <ActionLink href={appPath("/templates")} variant="secondary" size="md">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </ActionLink>
  );

  if (error) {
    return (
      <PageShell>
        <EditorHeading title="Edit template" back={back} />
        <StatusNotice className="mt-4" message={error} tone="error" />
      </PageShell>
    );
  }

  if (!initial) {
    return (
      <PageShell>
        <EditorHeading title="Edit template" back={back} />
        <ContentPlaceholder
          label="Loading template..."
          rows={EDITOR_PLACEHOLDER_ROWS}
          rowClassName={EDITOR_PLACEHOLDER_CLASS}
        />
      </PageShell>
    );
  }

  return <TemplateEditorClient mode="edit" templateId={templateId} initial={initial} />;
}

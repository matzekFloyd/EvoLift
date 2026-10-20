import type { Metadata } from "next";
import { PlanEditorClient } from "@/app/plans/plan-editor-client";

export const metadata: Metadata = {
  title: "New plan",
};

export default function NewPlanPage() {
  return <PlanEditorClient mode="create" />;
}

import type { Metadata } from "next";
import { TemplateEditorClient } from "@/app/templates/template-editor-client";

export const metadata: Metadata = {
  title: "New template",
};

export default function NewTemplatePage() {
  return <TemplateEditorClient mode="create" />;
}

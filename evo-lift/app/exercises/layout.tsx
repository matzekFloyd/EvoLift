import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_DOCUMENT_TITLE, formatDocumentTitle } from "@/lib/page-title";

export const metadata: Metadata = {
  title: {
    absolute: formatDocumentTitle("Exercises"),
    template: `${APP_DOCUMENT_TITLE} - %s`,
  },
};

export default function ExercisesLayout({ children }: { children: ReactNode }) {
  return children;
}

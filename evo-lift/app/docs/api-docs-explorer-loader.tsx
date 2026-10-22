"use client";

import dynamic from "next/dynamic";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { DOCS_PLACEHOLDER_CLASS } from "@/app/components/content-placeholder-layout";

/** Swagger UI stays off every route except API docs, and off the docs shell until this view mounts. */
export const ApiDocsExplorer = dynamic(
  () => import("@/app/docs/api-docs-explorer").then((mod) => mod.ApiDocsExplorer),
  {
    ssr: false,
    loading: () => <ContentPlaceholder rowClassName={DOCS_PLACEHOLDER_CLASS} />,
  },
);

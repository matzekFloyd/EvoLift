"use client";

import { useEffect } from "react";
import { APP_DOCUMENT_TITLE, formatDocumentTitle } from "@/lib/page-title";

type DocumentTitleProps = {
  page: string | null | undefined;
};

/** Sets the tab title for pages whose name is only known after client data loads. */
export function DocumentTitle({ page }: DocumentTitleProps) {
  useEffect(() => {
    const trimmed = page?.trim();
    if (!trimmed) {
      return;
    }
    const nextTitle = formatDocumentTitle(trimmed);
    document.title = nextTitle;
    return () => {
      if (document.title === nextTitle) {
        document.title = APP_DOCUMENT_TITLE;
      }
    };
  }, [page]);

  return null;
}

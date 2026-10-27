"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiDocsExplorer } from "@/app/docs/api-docs-explorer-loader";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { DOCS_PLACEHOLDER_CLASS } from "@/app/components/content-placeholder-layout";
import { PageShell } from "@/app/components/page-shell";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export default function ApiDocsPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const session = await getBrowserAuthSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setAccessToken(session.access_token);
      setIsChecking(false);
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setAccessToken(session.access_token);
      setIsChecking(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API docs</h1>
        <p className="mt-1 max-w-prose text-sm text-zinc-600">
          Requests use your current session. To try a personal API token instead, use
          Authorize and paste the token value.
        </p>
      </div>
      <section className="panel w-full min-w-0 overflow-x-auto p-3 sm:p-5">
        {isChecking || !accessToken ? (
          <ContentPlaceholder label="Checking session..." rowClassName={DOCS_PLACEHOLDER_CLASS} />
        ) : (
          <ApiDocsExplorer accessToken={accessToken} />
        )}
      </section>
    </PageShell>
  );
}

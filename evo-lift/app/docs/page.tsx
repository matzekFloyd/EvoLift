"use client";

import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiDocsExplorer } from "@/app/docs/api-docs-explorer";
import { PageShell } from "@/app/components/page-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export default function ApiDocsPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();

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

  if (isChecking || !accessToken) {
    return (
      <PageShell className="items-center justify-center">
        <p className="text-sm text-zinc-600">Checking session...</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <BookOpen className="h-6 w-6 text-sky-700" />
        API docs
      </h1>
      <p className="max-w-prose text-sm text-zinc-600">
        Requests use your current session. To try a personal API token instead, use
        Authorize and paste the token value.
      </p>
      <ApiDocsExplorer accessToken={accessToken} />
    </PageShell>
  );
}

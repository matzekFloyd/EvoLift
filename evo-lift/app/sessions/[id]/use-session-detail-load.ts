"use client";

import { useEffect, type MutableRefObject } from "react";
import type { useRouter } from "next/navigation";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import {
  openedSessionEpoch,
  peekOpenedSession,
  rememberOpenedSession,
  type OpenedSessionSnapshot,
} from "@/lib/opened-session-cache";
import { createPageLoadPerfTracker } from "@/lib/page-load-perf";
import { loadSessionSnapshot } from "./session-detail-load";

/** Shows the cached session at once, then refreshes it from Supabase unless the lifter is mid-edit. */
export function useSessionDetailLoad(input: {
  sessionId: string | undefined;
  router: ReturnType<typeof useRouter>;
  /** True while an edit or save is in flight; the refresh then skips applying fetched data. */
  skipSessionRefreshRef: MutableRefObject<boolean>;
  applyOpenedSession: (snapshot: OpenedSessionSnapshot, keepDrafts?: boolean) => void;
  setIsChecking: (isChecking: boolean) => void;
  showError: (messageText: string) => void;
}) {
  const { sessionId, router, skipSessionRefreshRef, applyOpenedSession, setIsChecking, showError } =
    input;

  useEffect(() => {
    let isMounted = true;
    const startedEpoch = openedSessionEpoch();
    const perf = createPageLoadPerfTracker("/app/sessions/[id]");

    async function loadData() {
      if (!sessionId) {
        setIsChecking(false);
        return;
      }
      const visit = await perf.trackQuery("auth.getUser", () => confirmSignedInUser());

      if (!isMounted || startedEpoch !== openedSessionEpoch()) {
        return;
      }
      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }
      const cached = peekOpenedSession(visit.userId, sessionId);
      if (cached && visit.showCached) {
        if (!skipSessionRefreshRef.current) {
          applyOpenedSession(cached);
        }
      } else {
        setIsChecking(true);
      }
      const authUserId = visit.userId;

      const result = await loadSessionSnapshot({
        perf,
        sessionId,
        authUserId,
        isActive: () => isMounted,
      });
      if (result.status === "cancelled") {
        return;
      }
      if (result.status === "error") {
        showError(result.message);
        setIsChecking(false);
        perf.flush();
        return;
      }
      if (!isMounted || startedEpoch !== openedSessionEpoch()) {
        perf.flush();
        return;
      }
      rememberOpenedSession(authUserId, sessionId, result.snapshot);
      if (!skipSessionRefreshRef.current) {
        applyOpenedSession(result.snapshot, false);
      }
      perf.flush();
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [router, sessionId]);
}

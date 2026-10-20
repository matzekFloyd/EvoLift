import { clearSignedInMemory, rememberedUserId, rememberUserId } from "@/lib/signed-in-memory";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";

export type SignedInVisit =
  | { status: "signed-out" }
  | { status: "ready"; userId: string; email: string | null; accessToken: string; showCached: boolean };

/**
 * Confirm the signed-in user. `showCached` is true only when this tab already
 * painted that same user's lists, so a refresh can run behind them.
 */
export async function confirmSignedInUser(): Promise<SignedInVisit> {
  const previous = rememberedUserId();
  const session = await getBrowserAuthSession();
  if (!session) {
    clearSignedInMemory();
    return { status: "signed-out" };
  }
  const email = session.user.email ?? null;
  if (previous && previous !== session.user.id) {
    clearSignedInMemory();
    rememberUserId(session.user.id, email);
    return {
      status: "ready",
      userId: session.user.id,
      email,
      accessToken: session.access_token,
      showCached: false,
    };
  }
  rememberUserId(session.user.id, email);
  return {
    status: "ready",
    userId: session.user.id,
    email,
    accessToken: session.access_token,
    showCached: previous === session.user.id,
  };
}

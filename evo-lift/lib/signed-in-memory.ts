import { invalidateAccountProfile } from "@/lib/account-profile-cache";
import { invalidateGoalsList } from "@/lib/goals-list-cache";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import { invalidatePlansList } from "@/lib/plans-list-cache";
import { invalidateTemplatesList } from "@/lib/templates-list-cache";

type TabUser = {
  id: string;
  email: string | null;
};

let tabUser: TabUser | null = null;

export function rememberedUserId(): string | null {
  return tabUser?.id ?? null;
}

export function rememberedUserEmail(): string | null {
  return tabUser?.email ?? null;
}

/** Drop every signed-in list kept for this tab, including the remembered user. */
export function clearSignedInMemory() {
  tabUser = null;
  invalidateLoggedHistoryCaches();
  invalidatePlansList();
  invalidateTemplatesList();
  invalidateGoalsList();
  invalidateAccountProfile();
}

/**
 * Remember who this tab is showing. A different user drops the previous lists
 * before the id changes, so those rows are not painted for the new account.
 */
export function rememberUserId(id: string, email: string | null) {
  if (tabUser?.id === id) {
    tabUser = { id, email: email ?? tabUser.email };
    return;
  }
  if (tabUser) {
    clearSignedInMemory();
  }
  tabUser = { id, email };
}

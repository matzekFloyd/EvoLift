import { invalidateAccountProfile } from "@/lib/account-profile-cache";
import { invalidateGoalsList } from "@/lib/goals-list-cache";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import { invalidatePlansList } from "@/lib/plans-list-cache";
import { invalidateTemplatesList } from "@/lib/templates-list-cache";

export const ACCOUNT_IMPORT_SUCCESS = "Imported your account data.";
export const ACCOUNT_IMPORT_FAILED = "Could not import this file. Try again.";
export const ACCOUNT_EXPORT_FAILED = "Could not download your account data. Try again.";

export function accountImportSelectionLabel(names: readonly string[]): string {
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return names[0] ?? "";
  }
  return `${names.length} files`;
}

/** Drop remembered workout and account pages after an import. */
export function invalidateAfterAccountImport(): void {
  invalidateAccountProfile();
  invalidateLoggedHistoryCaches();
  invalidatePlansList();
  invalidateTemplatesList();
  invalidateGoalsList();
}

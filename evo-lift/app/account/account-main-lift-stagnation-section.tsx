import { Save } from "lucide-react";
import type { MainLiftStagnationWeeksState } from "@/app/account/use-main-lift-stagnation-weeks";
import { ActionButton } from "@/app/components/action-button";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";
import { TextField } from "@/app/components/text-field";
import {
  MAX_MAIN_LIFT_STAGNATION_WEEKS,
  MIN_MAIN_LIFT_STAGNATION_WEEKS,
} from "@/lib/main-lift-stagnation";

export function AccountMainLiftStagnationSection({
  stagnation,
}: {
  stagnation: MainLiftStagnationWeeksState;
}) {
  const { draft, setDraft, isSaving, canSave, notice, handleSave } = stagnation;
  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Stalled lifts"
        description="Squat, Bench, Deadlift, and Press. Insights shows a note when the estimated 1RM stays flat for this long. The note uses the date range on Insights."
      />
      <SettingsSectionBody>
        <form onSubmit={handleSave} className="space-y-3">
          {notice.message ? (
            <StatusNotice message={notice.message} tone={notice.tone} onDismiss={notice.clear} />
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label htmlFor="main-lift-stagnation-weeks" className="block min-w-0 text-sm font-medium sm:max-w-xs sm:flex-1">
              Weeks
              <TextField
                id="main-lift-stagnation-weeks"
                type="number"
                inputMode="numeric"
                min={MIN_MAIN_LIFT_STAGNATION_WEEKS}
                max={MAX_MAIN_LIFT_STAGNATION_WEEKS}
                step={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="mt-1 w-full"
              />
            </label>
            <ActionButton
              type="submit"
              variant="primary"
              disabled={isSaving || !canSave}
              className="w-full sm:w-40"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {isSaving ? "Saving..." : "Save"}
            </ActionButton>
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}

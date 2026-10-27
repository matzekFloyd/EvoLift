import { Save } from "lucide-react";
import type { DoubleProgressionState } from "@/app/account/use-double-progression";
import { ActionButton } from "@/app/components/action-button";
import { SelectField } from "@/app/components/select-field";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";

export function AccountDoubleProgressionSection({
  progression,
}: {
  progression: DoubleProgressionState;
}) {
  const { enabled, setEnabled, isSaving, canSave, notice, handleSave } = progression;
  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Double progression"
        description="Adds 2 reps at the same weight, then adds weight and returns to the lower reps. It applies to the next session, and only when Suggest a target weight is on."
      />
      <SettingsSectionBody>
        <form onSubmit={handleSave} className="space-y-3">
          {notice.message ? (
            <StatusNotice message={notice.message} tone={notice.tone} onDismiss={notice.clear} />
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-0 text-sm font-medium sm:max-w-xs sm:flex-1">
              Use double progression
              <SelectField
                value={enabled ? "yes" : "no"}
                onChange={(event) => setEnabled(event.target.value === "yes")}
                className="mt-1 w-full"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </SelectField>
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

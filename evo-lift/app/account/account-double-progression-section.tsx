import { Save, TrendingUp } from "lucide-react";
import type { DoubleProgressionState } from "@/app/account/use-double-progression";
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
        icon={<TrendingUp className="h-4 w-4 text-zinc-500" aria-hidden />}
      />
      <SettingsSectionBody>
        <form onSubmit={handleSave} className="space-y-3">
          {notice.message ? (
            <StatusNotice message={notice.message} tone={notice.tone} onDismiss={notice.clear} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <label className="block min-w-0 text-sm font-medium">
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
            <div className="hidden sm:block" aria-hidden />
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <div aria-hidden />
              <button
                type="submit"
                disabled={isSaving || !canSave}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-1.5 py-0 text-xs font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:px-2 sm:text-sm"
              >
                <Save className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden />
                <span className="min-w-0 text-center leading-tight">
                  {isSaving ? "Saving..." : "Save"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}

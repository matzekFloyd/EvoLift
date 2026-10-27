import { Save } from "lucide-react";
import { BodyweightLogPanel } from "@/app/account/bodyweight-log-panel";
import { accountAgeDisplay, localIsoDate } from "@/app/account/account-profile-form";
import { PRODUCT_TOUR_TARGET_IDS } from "@/lib/product-tour";
import type { AccountMetricsState } from "@/app/account/use-account-metrics";
import { ActionButton } from "@/app/components/action-button";
import { DateInput } from "@/app/components/date-input";
import { SelectField } from "@/app/components/select-field";
import { TextField } from "@/app/components/text-field";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";

export function AccountMetricsSection({ metrics }: { metrics: AccountMetricsState }) {
  const {
    bodyweightKg,
    setBodyweightKg,
    bodyweightLog,
    heightCm,
    setHeightCm,
    sex,
    setSex,
    dateOfBirth,
    setDateOfBirth,
    birthYearFallback,
    isSaving,
    canSave,
    notice,
    handleSubmit,
    saveBodyweightEntry,
    removeBodyweightEntry,
  } = metrics;
  const today = new Date();
  const todayIso = localIsoDate(today);
  const { exactAge, yearOnlyAge } = accountAgeDisplay({ dateOfBirth, birthYearFallback, now: today });

  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Body metrics"
        description="Optional. Bodyweight, sex, and date of birth are used on Insights to compare your main lifts with published standards. They do not change the weights you log."
      />
      <SettingsSectionBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label id={PRODUCT_TOUR_TARGET_IDS.bodyweight} className="block text-sm font-medium">
              Bodyweight (kg)
              <TextField
                type="number"
                step="0.1"
                value={bodyweightKg}
                onChange={(event) => setBodyweightKg(event.target.value)}
                className="mt-1 w-full"
                placeholder="Optional"
              />
            </label>
            <label className="block text-sm font-medium">
              Height (cm)
              <TextField
                type="number"
                min={100}
                max={250}
                step="0.1"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                className="mt-1 w-full"
                placeholder="Optional"
              />
            </label>
            <label className="block text-sm font-medium">
              Sex
              <SelectField
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                className="mt-1 w-full"
              >
                <option value="">Not set</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </SelectField>
            </label>
            <label className="block text-sm font-medium">
              Date of birth
              <DateInput
                min="1900-01-01"
                max={todayIso}
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="mt-1 w-full"
              />
              {exactAge != null ? (
                <span className="mt-1 block text-sm text-zinc-500">{exactAge} years old</span>
              ) : yearOnlyAge != null ? (
                <span className="mt-1 block text-sm text-zinc-500">
                  Year of birth on file: {birthYearFallback}. About {yearOnlyAge} years old.
                </span>
              ) : null}
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {notice.message ? (
              <StatusNotice
                message={notice.message}
                tone={notice.tone}
                onDismiss={notice.clear}
                className="sm:flex-1"
              />
            ) : (
              <div className="hidden sm:block sm:flex-1" />
            )}
            <ActionButton
              type="submit"
              variant="primary"
              disabled={isSaving || !canSave}
              className="w-full sm:w-40"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {isSaving ? "Saving..." : "Save metrics"}
            </ActionButton>
          </div>
        </form>
        <BodyweightLogPanel
          entries={bodyweightLog}
          today={todayIso}
          onSave={saveBodyweightEntry}
          onRemove={removeBodyweightEntry}
        />
      </SettingsSectionBody>
    </SettingsSection>
  );
}

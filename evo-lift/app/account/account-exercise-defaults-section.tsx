import { Eraser, Save } from "lucide-react";
import type { ExerciseDefaultsState } from "@/app/account/use-exercise-defaults";
import { ActionButton } from "@/app/components/action-button";
import { ExerciseSearchSelect } from "@/app/components/exercise-search-select";
import { SelectField } from "@/app/components/select-field";
import { TextField } from "@/app/components/text-field";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";

export function AccountExerciseDefaultsSection({
  exerciseOptions,
  defaults,
}: {
  exerciseOptions: Array<{ id: string; label: string; slug: string }>;
  defaults: ExerciseDefaultsState;
}) {
  const {
    selectedExerciseId,
    setSelectedExerciseId,
    defaultBaseWeightKg,
    setDefaultBaseWeightKg,
    defaultTargetSets,
    setDefaultTargetSets,
    defaultTargetReps,
    setDefaultTargetReps,
    defaultTargetWeightKg,
    setDefaultTargetWeightKg,
    maxWarmupSets,
    setMaxWarmupSets,
    suggestWarmups,
    setSuggestWarmups,
    suggestTarget,
    setSuggestTarget,
    isSaving,
    isClearing,
    canSave,
    canClear,
    notice,
    handleSave,
    handleClear,
  } = defaults;
  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Exercise defaults"
        description="Saved per exercise. Values here prefill when you add that exercise to a session."
      />
      <SettingsSectionBody>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium sm:col-span-2">
              Exercise
              <ExerciseSearchSelect
                required
                className="mt-1 w-full"
                options={exerciseOptions}
                value={selectedExerciseId}
                onChange={setSelectedExerciseId}
              />
            </label>
            <label className="block text-sm font-medium">
              Base weight (kg)
              <TextField
                type="number"
                min={0}
                step="0.25"
                value={defaultBaseWeightKg}
                onChange={(event) => setDefaultBaseWeightKg(event.target.value)}
                className="mt-1 w-full"
                placeholder="e.g. 20"
              />
            </label>
          </div>
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <h3 className="text-sm font-medium text-zinc-800">Targets</h3>
            <p className="text-sm leading-snug text-zinc-600">
              Target sets and target reps are working sets. Warmups are extra.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Target working sets
                <TextField
                  type="number"
                  min={1}
                  value={defaultTargetSets}
                  onChange={(event) => setDefaultTargetSets(event.target.value)}
                  className="mt-1 w-full"
                  placeholder="e.g. 3"
                />
              </label>
              <label className="block text-sm font-medium">
                Target weight (kg)
                <TextField
                  type="number"
                  min={0}
                  step="0.25"
                  value={defaultTargetWeightKg}
                  onChange={(event) => setDefaultTargetWeightKg(event.target.value)}
                  className="mt-1 w-full"
                  placeholder="e.g. 60"
                />
              </label>
              <label className="block text-sm font-medium">
                Target reps (working sets)
                <TextField
                  type="number"
                  min={1}
                  value={defaultTargetReps}
                  onChange={(event) => setDefaultTargetReps(event.target.value)}
                  className="mt-1 w-full"
                  placeholder="e.g. 8"
                />
              </label>
            </div>
          </div>
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <h3 className="text-sm font-medium text-zinc-800">Suggestions</h3>
            <p className="text-sm leading-snug text-zinc-600">
              Leave maximum warmup sets empty to keep the full ladder.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Suggest a target weight
                <SelectField
                  value={suggestTarget ? "yes" : "no"}
                  onChange={(event) => setSuggestTarget(event.target.value === "yes")}
                  className="mt-1 w-full"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </SelectField>
              </label>
              <label className="block text-sm font-medium">
                Suggest warmups
                <SelectField
                  value={suggestWarmups ? "yes" : "no"}
                  onChange={(event) => setSuggestWarmups(event.target.value === "yes")}
                  className="mt-1 w-full"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </SelectField>
              </label>
              <label className="block text-sm font-medium">
                Maximum warmup sets
                <TextField
                  type="number"
                  step={1}
                  min={1}
                  value={maxWarmupSets}
                  onChange={(event) => setMaxWarmupSets(event.target.value)}
                  className="mt-1 w-full"
                  placeholder="e.g. 2"
                />
              </label>
            </div>
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <ActionButton
                type="button"
                variant="secondary"
                iconColor="amber"
                onClick={handleClear}
                disabled={isClearing || !canClear}
                className="w-full sm:w-auto"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden />
                {isClearing ? "Clearing..." : "Clear defaults"}
              </ActionButton>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={isSaving || !canSave}
                className="w-full sm:w-auto"
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                {isSaving ? "Saving..." : "Save defaults"}
              </ActionButton>
            </div>
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}

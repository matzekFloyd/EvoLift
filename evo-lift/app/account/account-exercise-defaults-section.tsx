import { Eraser, Save, SlidersHorizontal } from "lucide-react";
import type { ExerciseDefaultsState } from "@/app/account/use-exercise-defaults";
import { ExerciseSearchSelect } from "@/app/components/exercise-search-select";
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
        icon={<SlidersHorizontal className="h-4 w-4 text-zinc-500" />}
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
              <input
                type="number"
                min={0}
                step="0.25"
                value={defaultBaseWeightKg}
                onChange={(event) => setDefaultBaseWeightKg(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 py-2 text-sm"
                placeholder="e.g. 20"
              />
            </label>
          </div>
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <h3 className="text-sm font-medium text-zinc-800">Targets</h3>
            <p className="text-sm leading-snug text-zinc-600">
              Targets are your usual sets, weight, and reps for this exercise. Those values are
              prefilled when you add the exercise to a session.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Target working sets
                <input
                  type="number"
                  min={1}
                  value={defaultTargetSets}
                  onChange={(event) => setDefaultTargetSets(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 3"
                />
              </label>
              <label className="block text-sm font-medium">
                Target weight (kg)
                <input
                  type="number"
                  min={0}
                  step="0.25"
                  value={defaultTargetWeightKg}
                  onChange={(event) => setDefaultTargetWeightKg(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 60"
                />
              </label>
              <label className="block text-sm font-medium">
                Target reps (working sets)
                <input
                  type="number"
                  min={1}
                  value={defaultTargetReps}
                  onChange={(event) => setDefaultTargetReps(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 8"
                />
              </label>
            </div>
          </div>
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <h3 className="text-sm font-medium text-zinc-800">Suggestions</h3>
            <p className="text-sm leading-snug text-zinc-600">
              For this exercise only. Suggest warmups shows the warmup ladder toward the target
              weight. Leave maximum warmup sets empty to keep every step, or enter a number to keep
              that many of the heaviest steps.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Suggest a target weight
                <select
                  value={suggestTarget ? "yes" : "no"}
                  onChange={(event) => setSuggestTarget(event.target.value === "yes")}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Suggest warmups
                <select
                  value={suggestWarmups ? "yes" : "no"}
                  onChange={(event) => setSuggestWarmups(event.target.value === "yes")}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Maximum warmup sets
                <input
                  type="number"
                  step={1}
                  min={1}
                  value={maxWarmupSets}
                  onChange={(event) => setMaxWarmupSets(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 2"
                />
              </label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
            <div
              className={
                notice.message
                  ? "min-w-0 sm:col-span-2"
                  : "hidden min-h-0 sm:col-span-2 sm:block"
              }
            >
              {notice.message ? (
                <StatusNotice message={notice.message} tone={notice.tone} onDismiss={notice.clear} />
              ) : null}
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={isClearing || !canClear}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0 text-xs font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 disabled:opacity-60 sm:px-2 sm:text-sm"
              >
                <Eraser className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="min-w-0 text-center leading-tight">
                  {isClearing ? "Clearing..." : "Clear defaults"}
                </span>
              </button>
              <button
                type="submit"
                disabled={isSaving || !canSave}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-1.5 py-0 text-xs font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:px-2 sm:text-sm"
              >
                <Save className="h-3.5 w-3.5 shrink-0 text-white" />
                <span className="min-w-0 text-center leading-tight">
                  {isSaving ? "Saving..." : "Save defaults"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}

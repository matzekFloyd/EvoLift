import { EyeOff } from "lucide-react";
import type { HiddenExercisesState } from "@/app/account/use-hidden-exercises";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { ExerciseFilteredList } from "@/app/components/exercise-filtered-list";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";

export function AccountHiddenExercisesSection({
  exerciseOptions,
  hidden,
}: {
  exerciseOptions: Array<{ id: string; label: string; slug: string }>;
  hidden: HiddenExercisesState;
}) {
  const { hiddenExerciseIds, toggleExerciseId, notice, handleToggle } = hidden;
  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Hidden exercises"
        description="Hidden exercises will not appear when you choose exercises for new workout entries. Your past workout sessions stay the same, and you can still set defaults for all exercises below."
        icon={<EyeOff className="h-4 w-4 text-zinc-500" />}
      />
      <SettingsSectionBody>
        {notice.message ? (
          <StatusNotice
            message={notice.message}
            tone={notice.tone}
            onDismiss={notice.clear}
            className="mt-3"
          />
        ) : null}
        <ExerciseFilteredList
          items={exerciseOptions}
          filterLabel="Filter list"
          renderItem={(option) => {
            const isHidden = hiddenExerciseIds.has(option.id);
            const isBusy = toggleExerciseId === option.id;
            return (
              <div className="flex items-center justify-between gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 text-sm">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ExerciseBadgeChip slug={option.slug} />
                  <span className="truncate text-zinc-900">{option.label}</span>
                </span>
                <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isHidden}
                    disabled={isBusy}
                    onChange={(event) => {
                      void handleToggle(option.id, event.target.checked);
                    }}
                  />
                  Hide
                </label>
              </div>
            );
          }}
        />
      </SettingsSectionBody>
    </SettingsSection>
  );
}

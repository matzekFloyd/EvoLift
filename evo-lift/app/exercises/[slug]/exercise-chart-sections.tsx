import {
  ExerciseSessionE1rmChart,
  ExerciseSessionVolumeChart,
  ExerciseWeightProgressChart,
} from "@/app/components/chart-dynamic";
import { InfoPopover } from "@/app/components/info-popover";
import { panelInsetClass } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import type { buildExerciseSessionE1rmChartPoints } from "@/lib/exercise-session-e1rm-chart";
import type { buildExerciseSessionVolumeChartPoints } from "@/lib/exercise-session-volume-chart";
import type { buildExerciseSessionWeightChartPoints } from "@/lib/exercise-session-weight-chart";

export function ExerciseWeightChartSection({
  points,
  assistance,
}: {
  points: ReturnType<typeof buildExerciseSessionWeightChartPoints>;
  assistance: boolean;
}) {
  return (
    <section
      className={panelInsetClass("p-4 sm:p-5")}
      aria-labelledby="exercise-detail-chart-heading"
    >
      <div className="flex items-center gap-2">
        <SectionHeading id="exercise-detail-chart-heading" className="min-w-0 flex-1">
          Weight by session
        </SectionHeading>
        <InfoPopover label="How this chart works">
          <div className="space-y-2">
            {assistance ? (
              <p>
                Each point uses the hardest working set by assistance in that session. The chart
                shows Assistance (kg). Blank or 0 is unassisted bodyweight. Warmups are omitted.
              </p>
            ) : (
              <>
                <p>
                  Total (kg) matches set history: loaded plus that session’s base for this
                  exercise. Each point uses the hardest working set that has a logged load (same
                  idea as your max-total stat).
                </p>
                <p>
                  The line starts on Loaded (kg). Switch to Total or Both to include the base.
                  Warmups and sets with no logged weight are omitted. Tap or hover a point for
                  loaded, total, and base together.
                </p>
              </>
            )}
          </div>
        </InfoPopover>
      </div>
      <div className="mt-3">
        <ExerciseWeightProgressChart points={points} assistance={assistance} />
      </div>
    </section>
  );
}

export function ExerciseE1rmChartSection({
  points,
  assistance,
}: {
  points: ReturnType<typeof buildExerciseSessionE1rmChartPoints>;
  assistance: boolean;
}) {
  return (
    <section
      className={panelInsetClass("p-4 sm:p-5")}
      aria-labelledby="exercise-detail-e1rm-heading"
    >
      <div className="flex items-center gap-2">
        <SectionHeading id="exercise-detail-e1rm-heading" className="min-w-0 flex-1">
          Estimated one-rep max (1RM)
        </SectionHeading>
        <InfoPopover label="How estimated one-rep max works">
          <div className="space-y-2">
            {assistance ? (
              <p>
                Assistance is counterweight help, not load moved. Estimated 1RM is not
                calculated for Assisted Dip or Assisted Pull-Up.
              </p>
            ) : (
              <>
                <p>
                  Each point is one workout session. The value is the highest estimated 1RM
                  from a <span className="font-medium">working set</span> with a logged load
                  and 12 reps or fewer, using Total (kg) and the Epley formula. It is not a
                  tested max.
                </p>
                <p>
                  Warmups and sets above 12 reps are excluded. Tap or hover a point for the
                  set that produced the estimate.
                </p>
              </>
            )}
          </div>
        </InfoPopover>
      </div>
      <div className="mt-3">
        {assistance ? (
          <p className="text-sm text-zinc-600">
            Assistance is not used for estimated 1RM, so there is nothing to plot.
          </p>
        ) : (
          <ExerciseSessionE1rmChart points={points} />
        )}
      </div>
    </section>
  );
}

export function ExerciseVolumeChartSection({
  points,
  assistance,
}: {
  points: ReturnType<typeof buildExerciseSessionVolumeChartPoints>;
  assistance: boolean;
}) {
  return (
    <section
      className={panelInsetClass("p-4 sm:p-5")}
      aria-labelledby="exercise-detail-volume-heading"
    >
      <div className="flex items-center gap-2">
        <SectionHeading id="exercise-detail-volume-heading" className="min-w-0 flex-1">
          Session volume
        </SectionHeading>
        <InfoPopover label="How session volume works">
          <div className="space-y-2">
            {assistance ? (
              <p>
                Assistance is counterweight help, not load moved. Session volume is not
                calculated for Assisted Dip or Assisted Pull-Up.
              </p>
            ) : (
              <>
                <p>
                  Each point is one workout session. Volume is the sum of reps × Total (kg) on
                  the bar for every <span className="font-medium">working set</span> with a
                  logged load—same Total (kg) as set history (loaded plus base for that
                  session).
                </p>
                <p>
                  Warmup sets are excluded. Sets without a logged weight are not counted. Tap
                  or hover a point for session totals.
                </p>
              </>
            )}
          </div>
        </InfoPopover>
      </div>
      <div className="mt-3">
        {assistance ? (
          <p className="text-sm text-zinc-600">
            Assistance is not counted as training volume, so there is nothing to plot.
          </p>
        ) : (
          <ExerciseSessionVolumeChart points={points} />
        )}
      </div>
    </section>
  );
}

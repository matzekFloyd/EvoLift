/**
 * The track is for a goal still short of its target.
 * A reached goal already has its badge, and a missing bodyweight has words instead of an empty track.
 */
export function goalMeterVisible(input: { percent: number | null; achieved: boolean }): boolean {
  return input.percent != null && !input.achieved;
}

/** Track width. A missing bodyweight has no percent, so the track stays empty. */
export function goalMeterWidth(percent: number | null): number {
  if (percent == null || !Number.isFinite(percent)) {
    return 0;
  }
  return Math.min(100, Math.max(0, percent));
}

/** Status words sit with the percent so the meter is not color alone. */
export function goalMeterValueText(input: {
  percent: number | null;
  pastDue: boolean;
  achieved: boolean;
}): string {
  if (input.percent == null) {
    return input.pastDue ? "Past due. Needs bodyweight" : "Needs bodyweight";
  }
  const percent = `${input.percent}%`;
  if (input.pastDue) {
    return `Past due, ${percent}`;
  }
  if (input.achieved) {
    return `Achieved, ${percent}`;
  }
  return percent;
}

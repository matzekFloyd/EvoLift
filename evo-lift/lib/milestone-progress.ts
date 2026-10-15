import { bodyweightOnOrBefore, type BodyweightLogEntry } from "@/lib/bodyweight-log";

export type MilestoneType = "absolute" | "bodyweight_multiple";

export type MilestoneDefinition = {
  exerciseId: string;
  milestoneType: MilestoneType;
  targetWeightKg: number | null;
  bodyweightMultiple: number | null;
  minReps: number;
};

export type StoredAchievement = {
  achievedAt: string | null;
  achievedBodyweightKg: number | null;
  achievedThresholdKg: number | null;
};

export type MilestoneWorkingSet = {
  exerciseId: string;
  reps: number;
  totalKg: number;
  isWarmup: boolean;
  performedAt: string;
  /** Workout session date, `YYYY-MM-DD`. */
  performedOn: string;
};

export type GoalProgress =
  | {
      kind: "missing_bodyweight";
      pastDue: boolean;
    }
  | {
      kind: "active" | "achieved";
      thresholdKg: number;
      bestTotalKg: number | null;
      bestReps: number | null;
      gapKg: number;
      percent: number;
      achievedAt: string | null;
      pastDue: boolean;
    };

const emptyAchievement: StoredAchievement = {
  achievedAt: null,
  achievedBodyweightKg: null,
  achievedThresholdKg: null,
};

export function roundKg(value: number): number {
  return Math.round(value * 100) / 100;
}

export function workingSetTotalKg(loadedKg: number | null, baseKg: number | null): number | null {
  if (loadedKg == null) {
    return null;
  }
  const loaded = Number(loadedKg);
  const base = baseKg == null ? 0 : Number(baseKg);
  if (!Number.isFinite(loaded) || loaded < 0 || !Number.isFinite(base) || base < 0) {
    return null;
  }
  const total = roundKg(loaded + base);
  return total > 0 ? total : null;
}

function sameKg(left: number | null, right: number | null): boolean {
  if (left == null || right == null) {
    return left == null && right == null;
  }
  return roundKg(left) === roundKg(right);
}

export function milestoneDefinitionChanged(
  before: MilestoneDefinition,
  after: MilestoneDefinition,
): boolean {
  return (
    before.exerciseId !== after.exerciseId ||
    before.milestoneType !== after.milestoneType ||
    before.minReps !== after.minReps ||
    !sameKg(before.targetWeightKg, after.targetWeightKg) ||
    !sameKg(before.bodyweightMultiple, after.bodyweightMultiple)
  );
}

function qualifyingSets(
  sets: MilestoneWorkingSet[],
  exerciseId: string,
  minReps: number,
): MilestoneWorkingSet[] {
  return sets.filter(
    (set) =>
      set.exerciseId === exerciseId &&
      !set.isWarmup &&
      set.reps >= minReps &&
      set.totalKg > 0,
  );
}

function bestQualifyingSet(sets: MilestoneWorkingSet[]): MilestoneWorkingSet | null {
  let best: MilestoneWorkingSet | null = null;
  for (const set of sets) {
    if (
      !best ||
      set.totalKg > best.totalKg ||
      (set.totalKg === best.totalKg && set.performedAt < best.performedAt)
    ) {
      best = set;
    }
  }
  return best;
}

function earliestReachingSet(
  sets: MilestoneWorkingSet[],
  thresholdKg: number,
): MilestoneWorkingSet | null {
  let earliest: MilestoneWorkingSet | null = null;
  for (const set of sets) {
    if (roundKg(set.totalKg) < roundKg(thresholdKg)) {
      continue;
    }
    if (!earliest || set.performedAt < earliest.performedAt) {
      earliest = set;
    }
  }
  return earliest;
}

function liveThresholdKg(
  definition: MilestoneDefinition,
  bodyweightKg: number | null,
): number | "missing_bodyweight" | null {
  if (definition.milestoneType === "absolute") {
    if (definition.targetWeightKg == null || definition.targetWeightKg <= 0) {
      return null;
    }
    return roundKg(definition.targetWeightKg);
  }
  if (bodyweightKg == null || !(bodyweightKg > 0)) {
    return "missing_bodyweight";
  }
  if (definition.bodyweightMultiple == null || definition.bodyweightMultiple <= 0) {
    return null;
  }
  return roundKg(definition.bodyweightMultiple * bodyweightKg);
}

function isPastDue(dueOn: string | null, today: string, achieved: boolean): boolean {
  if (achieved || !dueOn) {
    return false;
  }
  return dueOn.slice(0, 10) < today;
}

function progressFromThreshold(
  kind: "active" | "achieved",
  thresholdKg: number,
  best: MilestoneWorkingSet | null,
  achievedAt: string | null,
  pastDue: boolean,
): GoalProgress {
  const gapKg = best ? Math.max(0, roundKg(thresholdKg - best.totalKg)) : thresholdKg;
  const percent =
    thresholdKg <= 0
      ? 0
      : best
        ? Math.min(100, (best.totalKg / thresholdKg) * 100)
        : kind === "achieved"
          ? 100
          : 0;
  return {
    kind,
    thresholdKg,
    bestTotalKg: best?.totalKg ?? null,
    bestReps: best?.reps ?? null,
    gapKg,
    percent,
    achievedAt,
    pastDue,
  };
}

function achievementsEqual(left: StoredAchievement, right: StoredAchievement): boolean {
  if (left.achievedAt !== right.achievedAt) {
    return false;
  }
  return (
    sameKg(left.achievedBodyweightKg, right.achievedBodyweightKg) &&
    sameKg(left.achievedThresholdKg, right.achievedThresholdKg)
  );
}

function missingBodyweight(
  input: {
    stored: StoredAchievement;
    dueOn: string | null;
    today: string;
    recalculate: boolean;
  },
): { progress: GoalProgress; stored: StoredAchievement; shouldWrite: boolean } {
  const clear = input.recalculate && input.stored.achievedAt != null;
  return {
    progress: {
      kind: "missing_bodyweight",
      pastDue: isPastDue(input.dueOn, input.today, false),
    },
    stored: clear ? emptyAchievement : input.stored,
    shouldWrite: clear,
  };
}

function resolveBodyweightMilestone(input: {
  definition: MilestoneDefinition;
  stored: StoredAchievement;
  qualifying: MilestoneWorkingSet[];
  bodyweightEntries: readonly BodyweightLogEntry[];
  dueOn: string | null;
  today: string;
  recalculate: boolean;
}): { progress: GoalProgress; stored: StoredAchievement; shouldWrite: boolean } {
  const multiple = input.definition.bodyweightMultiple;
  if (multiple == null || multiple <= 0) {
    return {
      progress: progressFromThreshold("active", 0, null, null, false),
      stored: input.stored,
      shouldWrite: false,
    };
  }

  const covered = input.qualifying.flatMap((set) => {
    const bodyweightKg = bodyweightOnOrBefore(input.bodyweightEntries, set.performedOn);
    if (bodyweightKg == null) {
      return [];
    }
    return [{ set, bodyweightKg, thresholdKg: roundKg(multiple * bodyweightKg) }];
  });
  if (covered.length === 0) {
    return missingBodyweight(input);
  }

  let hitting: (typeof covered)[number] | null = null;
  for (const item of covered) {
    if (roundKg(item.set.totalKg) < item.thresholdKg) {
      continue;
    }
    if (!hitting || item.set.performedAt < hitting.set.performedAt) {
      hitting = item;
    }
  }

  const best = bestQualifyingSet(covered.map((item) => item.set));
  if (hitting) {
    const next: StoredAchievement = {
      achievedAt: hitting.set.performedAt,
      achievedBodyweightKg: roundKg(hitting.bodyweightKg),
      achievedThresholdKg: hitting.thresholdKg,
    };
    return {
      progress: progressFromThreshold("achieved", hitting.thresholdKg, best, next.achievedAt, false),
      stored: next,
      shouldWrite: !achievementsEqual(input.stored, next),
    };
  }

  const currentBodyweight = bodyweightOnOrBefore(input.bodyweightEntries, input.today);
  const latestCovered = covered.reduce((current, item) =>
    item.set.performedOn > current.set.performedOn ? item : current,
  );
  const displayThreshold =
    currentBodyweight == null ? latestCovered.thresholdKg : roundKg(multiple * currentBodyweight);
  const cleared = input.stored.achievedAt != null;
  return {
    progress: progressFromThreshold(
      "active",
      displayThreshold,
      best,
      null,
      isPastDue(input.dueOn, input.today, false),
    ),
    stored: cleared ? emptyAchievement : input.stored,
    shouldWrite: cleared,
  };
}

export function resolveMilestone(input: {
  definition: MilestoneDefinition;
  stored: StoredAchievement;
  sets: MilestoneWorkingSet[];
  bodyweightEntries?: readonly BodyweightLogEntry[];
  dueOn: string | null;
  today: string;
  /** True after the exercise, type, target, multiple, or rep condition changes. */
  recalculate: boolean;
}): { progress: GoalProgress; stored: StoredAchievement; shouldWrite: boolean } {
  const qualifying = qualifyingSets(input.sets, input.definition.exerciseId, input.definition.minReps);
  const best = bestQualifyingSet(qualifying);

  if (!input.recalculate && input.stored.achievedAt && input.stored.achievedThresholdKg != null) {
    return {
      progress: progressFromThreshold(
        "achieved",
        roundKg(input.stored.achievedThresholdKg),
        best,
        input.stored.achievedAt,
        false,
      ),
      stored: input.stored,
      shouldWrite: false,
    };
  }

  if (input.definition.milestoneType === "bodyweight_multiple") {
    return resolveBodyweightMilestone({
      definition: input.definition,
      stored: input.stored,
      qualifying,
      bodyweightEntries: input.bodyweightEntries ?? [],
      dueOn: input.dueOn,
      today: input.today,
      recalculate: input.recalculate,
    });
  }

  const threshold = liveThresholdKg(input.definition, null);
  if (threshold == null) {
    return {
      progress: progressFromThreshold("active", 0, null, null, false),
      stored: input.stored,
      shouldWrite: false,
    };
  }

  const hitting = earliestReachingSet(qualifying, threshold);
  if (hitting) {
    const next: StoredAchievement = {
      achievedAt: hitting.performedAt,
      achievedBodyweightKg: null,
      achievedThresholdKg: threshold,
    };
    return {
      progress: progressFromThreshold("achieved", threshold, best, next.achievedAt, false),
      stored: next,
      shouldWrite: !achievementsEqual(input.stored, next),
    };
  }

  const cleared = input.stored.achievedAt != null;
  return {
    progress: progressFromThreshold(
      "active",
      threshold,
      best,
      null,
      isPastDue(input.dueOn, input.today, false),
    ),
    stored: cleared ? emptyAchievement : input.stored,
    shouldWrite: cleared,
  };
}

export function formatKgAmount(value: number): string {
  const rounded = roundKg(value);
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${text} kg`;
}

export function formatRepCount(reps: number): string {
  return reps === 1 ? "1 rep" : `${reps} reps`;
}

export function formatBodyweightMultiple(value: number): string {
  const rounded = roundKg(value);
  if (Number.isInteger(rounded)) {
    return rounded.toFixed(1);
  }
  return rounded.toFixed(2).replace(/0$/, "");
}

export function formatMilestoneTarget(definition: MilestoneDefinition): string {
  if (definition.milestoneType === "bodyweight_multiple" && definition.bodyweightMultiple != null) {
    return `${formatBodyweightMultiple(definition.bodyweightMultiple)}× bodyweight`;
  }
  if (definition.targetWeightKg != null) {
    return `${formatKgAmount(definition.targetWeightKg)} × ${formatRepCount(definition.minReps)}`;
  }
  return "Goal";
}

export function formatGoalGap(gapKg: number): string {
  return `${formatKgAmount(gapKg)} to go`;
}

export function formatBestSet(totalKg: number, reps: number): string {
  return `Best set: ${formatKgAmount(totalKg)} × ${formatRepCount(reps)}`;
}

const targetMaxKg = 9999.99;
const multipleMax = 99.99;

export function parseGoalForm(input: {
  exerciseId: string;
  milestoneType: MilestoneType;
  targetWeightKg: string;
  bodyweightMultiple: string;
  minReps: string;
  dueOn: string;
  note: string;
}):
  | {
      ok: true;
      definition: MilestoneDefinition;
      dueOn: string | null;
      note: string | null;
    }
  | { ok: false; message: string } {
  if (!input.exerciseId.trim()) {
    return { ok: false, message: "Please select an exercise." };
  }

  const repsText = input.minReps.trim();
  const reps = Number(repsText);
  if (!repsText || !Number.isFinite(reps) || !Number.isInteger(reps) || reps < 1) {
    return { ok: false, message: "Please enter a valid reps value." };
  }

  let targetWeightKg: number | null = null;
  let bodyweightMultiple: number | null = null;
  if (input.milestoneType === "absolute") {
    const targetText = input.targetWeightKg.trim();
    const target = Number(targetText);
    if (!targetText || !Number.isFinite(target) || target <= 0) {
      return { ok: false, message: "Please enter a target above 0 kg." };
    }
    if (target > targetMaxKg) {
      return { ok: false, message: "Please enter a target of 9999.99 kg or less." };
    }
    targetWeightKg = roundKg(target);
  } else {
    const multipleText = input.bodyweightMultiple.trim();
    const multiple = Number(multipleText);
    if (!multipleText || !Number.isFinite(multiple) || multiple <= 0) {
      return { ok: false, message: "Please enter a multiple above 0." };
    }
    if (multiple > multipleMax) {
      return { ok: false, message: "Please enter a multiple of 99.99 or less." };
    }
    bodyweightMultiple = roundKg(multiple);
  }

  const dueText = input.dueOn.trim();
  let dueOn: string | null = null;
  if (dueText) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueText) || Number.isNaN(new Date(`${dueText}T00:00:00`).getTime())) {
      return { ok: false, message: "Please enter a valid due date." };
    }
    dueOn = dueText;
  }

  const noteText = input.note.trim();
  if (noteText.length > 500) {
    return { ok: false, message: "Please enter a note of 500 characters or fewer." };
  }

  return {
    ok: true,
    definition: {
      exerciseId: input.exerciseId,
      milestoneType: input.milestoneType,
      targetWeightKg,
      bodyweightMultiple,
      minReps: reps,
    },
    dueOn,
    note: noteText.length > 0 ? noteText : null,
  };
}

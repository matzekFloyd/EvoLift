export type BodyweightLogEntry = {
  loggedOn: string;
  bodyweightKg: number;
};

const BODYWEIGHT_MIN = 20;
const BODYWEIGHT_MAX = 400;

export const BODYWEIGHT_INVALID = "Please enter a valid bodyweight.";
export const BODYWEIGHT_RANGE = `Bodyweight must be between ${BODYWEIGHT_MIN} and ${BODYWEIGHT_MAX} kg.`;
export const BODYWEIGHT_DATE_INVALID = "Please enter a valid date.";
export const BODYWEIGHT_DATE_FUTURE = "Please enter a date that is not in the future.";
export const BODYWEIGHT_DATE_TAKEN = "That date already has a bodyweight.";

function calendarDate(isoDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const normalized = `${year}-${month}-${day}`;
  return normalized === isoDate ? normalized : null;
}

/** Latest entry on or before `onDate`. A later entry does not apply. */
export function bodyweightOnOrBefore(
  entries: readonly BodyweightLogEntry[],
  onDate: string,
): number | null {
  const date = onDate.slice(0, 10);
  let match: BodyweightLogEntry | null = null;
  for (const entry of entries) {
    const loggedOn = entry.loggedOn.slice(0, 10);
    if (loggedOn > date) {
      continue;
    }
    if (match == null || loggedOn > match.loggedOn.slice(0, 10)) {
      match = entry;
    }
  }
  return match == null || !(match.bodyweightKg > 0) ? null : match.bodyweightKg;
}

export function latestBodyweightEntry(
  entries: readonly BodyweightLogEntry[],
): BodyweightLogEntry | null {
  let latest: BodyweightLogEntry | null = null;
  for (const entry of entries) {
    if (latest == null || entry.loggedOn.slice(0, 10) > latest.loggedOn.slice(0, 10)) {
      latest = entry;
    }
  }
  return latest;
}

/** Empty is allowed for the profile field. A present value must be 20 kg through 400 kg. */
export function bodyweightInputError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const kg = Number(trimmed);
  if (!Number.isFinite(kg)) {
    return BODYWEIGHT_INVALID;
  }
  if (kg < BODYWEIGHT_MIN || kg > BODYWEIGHT_MAX) {
    return BODYWEIGHT_RANGE;
  }
  return null;
}

export function bodyweightLogEntryError(input: {
  bodyweightKg: string;
  loggedOn: string;
  today: string;
  takenDates: readonly string[];
}): string | null {
  const loggedOn = calendarDate(input.loggedOn.trim());
  if (!loggedOn) {
    return BODYWEIGHT_DATE_INVALID;
  }
  if (loggedOn > input.today) {
    return BODYWEIGHT_DATE_FUTURE;
  }
  const trimmed = input.bodyweightKg.trim();
  if (!trimmed) {
    return BODYWEIGHT_INVALID;
  }
  const weightError = bodyweightInputError(trimmed);
  if (weightError) {
    return weightError;
  }
  if (input.takenDates.some((date) => date.slice(0, 10) === loggedOn)) {
    return BODYWEIGHT_DATE_TAKEN;
  }
  return null;
}

export function parseBodyweightKg(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || bodyweightInputError(trimmed)) {
    return null;
  }
  return Number(trimmed);
}

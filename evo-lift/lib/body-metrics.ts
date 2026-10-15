import { bodyweightInputError } from "@/lib/bodyweight-log";

const HEIGHT_CM_MIN = 100;
const HEIGHT_CM_MAX = 250;

export type ProfileSex = "female" | "male";

export type BodyMetricsFields = {
  bodyweightKg: string;
  heightCm: string;
  sex: string;
  dateOfBirth: string;
};

export type ParsedBodyMetrics = {
  bodyweight_kg: number | null;
  height_cm: number | null;
  sex: ProfileSex | null;
  date_of_birth: string | null;
};

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

export function validateBodyMetricsInput(
  fields: BodyMetricsFields,
  todayIso: string,
): { ok: true; value: ParsedBodyMetrics } | { ok: false; message: string } {
  const bwTrim = fields.bodyweightKg.trim();
  const hTrim = fields.heightCm.trim();
  const sexTrim = fields.sex.trim();
  const dobTrim = fields.dateOfBirth.trim();

  const bodyweight_kg = bwTrim === "" ? null : Number(bwTrim);
  const height_cm = hTrim === "" ? null : Number(hTrim);

  const bodyweightError = bodyweightInputError(bwTrim);
  if (bodyweightError) {
    return { ok: false, message: bodyweightError };
  }

  if (height_cm !== null) {
    if (!Number.isFinite(height_cm)) {
      return { ok: false, message: "Please enter a valid height." };
    }
    if (height_cm < HEIGHT_CM_MIN || height_cm > HEIGHT_CM_MAX) {
      return {
        ok: false,
        message: `Height must be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.`,
      };
    }
  }

  let sex: ProfileSex | null = null;
  if (sexTrim !== "") {
    if (sexTrim !== "female" && sexTrim !== "male") {
      return { ok: false, message: "Please choose female or male, or leave sex unset." };
    }
    sex = sexTrim;
  }

  let date_of_birth: string | null = null;
  if (dobTrim !== "") {
    const normalized = calendarDate(dobTrim);
    if (!normalized) {
      return { ok: false, message: "Please enter a valid date of birth." };
    }
    const year = Number(normalized.slice(0, 4));
    if (year < 1900 || normalized > todayIso) {
      return { ok: false, message: "Date of birth must be between 1900 and today." };
    }
    date_of_birth = normalized;
  }

  return {
    ok: true,
    value: { bodyweight_kg, height_cm, sex, date_of_birth },
  };
}

export function approximateAge(birthYear: number | null, currentCalendarYear: number): number | null {
  if (birthYear == null) {
    return null;
  }
  return currentCalendarYear - birthYear;
}

export function ageFromDateOfBirth(dateOfBirth: string, today = new Date()): number | null {
  const normalized = calendarDate(dateOfBirth);
  if (!normalized) {
    return null;
  }
  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(5, 7));
  const day = Number(normalized.slice(8, 10));
  let age = today.getFullYear() - year;
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  if (todayMonth < month || (todayMonth === month && todayDay < day)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function resolveLifterAge(input: {
  dateOfBirth: string | null;
  birthYear: number | null;
  today?: Date;
}): { ageYears: number; ageIsApproximate: boolean } | null {
  const today = input.today ?? new Date();
  if (input.dateOfBirth) {
    const age = ageFromDateOfBirth(input.dateOfBirth, today);
    return age == null ? null : { ageYears: age, ageIsApproximate: false };
  }
  if (input.birthYear != null) {
    const age = approximateAge(input.birthYear, today.getFullYear());
    return age == null || age < 0 ? null : { ageYears: age, ageIsApproximate: true };
  }
  return null;
}

export function birthYearFromDate(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) {
    return null;
  }
  const year = Number(dateOfBirth.slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

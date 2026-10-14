/**
 * ExRx.net adult weightlifting standards, ages 18–39, in kilograms.
 * Columns are Untrained, Novice, Intermediate, Advanced, Elite.
 * The last row of each table is the open-ended top bodyweight class.
 * https://exrx.net/Testing/WeightLifting/SquatStandardsKg
 * https://exrx.net/Testing/WeightLifting/BenchStandardsKg
 * https://exrx.net/Testing/WeightLifting/DeadliftStandardsKg
 * https://exrx.net/Testing/WeightLifting/PressStandardsKg
 */
export const EXRX_AGE_BAND = "18–39";

const LEVELS = ["Untrained", "Novice", "Intermediate", "Advanced", "Elite"] as const;

export type ExrxLevel = (typeof LEVELS)[number] | "Under the untrained mark";

type LevelKg = [number, number, number, number, number];

type StandardRow = {
  bodyweightKg: number;
  openEnded: boolean;
  levels: LevelKg;
};

/** bodyweight, then the five level thresholds. The last row is the open class. */
function grid(rows: Array<[number, number, number, number, number, number]>): StandardRow[] {
  return rows.map((row, index) => ({
    bodyweightKg: row[0],
    openEnded: index === rows.length - 1,
    levels: [row[1], row[2], row[3], row[4], row[5]],
  }));
}

const SQUAT_MEN = grid([
  [52, 35, 65, 80, 107.5, 145],
  [56, 37.5, 70, 87.5, 117.5, 157.5],
  [60, 40, 77.5, 92.5, 127.5, 167.5],
  [67, 45, 85, 105, 142.5, 185],
  [75, 50, 92.5, 112.5, 155, 202.5],
  [82, 55, 100, 122.5, 167.5, 217.5],
  [90, 57.5, 105, 130, 177.5, 230],
  [100, 60, 110, 135, 185, 240],
  [110, 62.5, 115, 140, 192.5, 250],
  [125, 65, 117.5, 145, 197.5, 257.5],
  [145, 67.5, 122.5, 147.5, 202.5, 262.5],
  [145, 70, 125, 150, 207.5, 270],
]);

const SQUAT_WOMEN = grid([
  [44, 20, 37.5, 45, 60, 75],
  [48, 22.5, 40, 47.5, 65, 80],
  [52, 25, 45, 52.5, 67.5, 87.5],
  [56, 25, 47.5, 55, 72.5, 90],
  [60, 27.5, 50, 60, 77.5, 95],
  [67, 30, 55, 62.5, 85, 105],
  [75, 32.5, 57.5, 67.5, 90, 115],
  [82, 35, 62.5, 75, 97.5, 122.5],
  [90, 37.5, 67.5, 80, 105, 132.5],
  [90, 40, 72.5, 85, 110, 137.5],
]);

const BENCH_MEN = grid([
  [52, 37.5, 50, 60, 82.5, 100],
  [56, 40, 52.5, 62.5, 90, 110],
  [60, 45, 57.5, 70, 95, 117.5],
  [67, 50, 65, 77.5, 107.5, 132.5],
  [75, 55, 70, 85, 115, 145],
  [82, 60, 75, 90, 125, 157.5],
  [90, 62.5, 80, 97.5, 132.5, 162.5],
  [100, 62.5, 82.5, 102.5, 137.5, 172.5],
  [110, 65, 85, 105, 142.5, 180],
  [125, 67.5, 87.5, 107.5, 147.5, 185],
  [145, 70, 90, 112.5, 152.5, 190],
  [145, 72.5, 92.5, 115, 155, 192.5],
]);

const BENCH_WOMEN = grid([
  [44, 22.5, 30, 35, 42.5, 52.5],
  [48, 25, 32.5, 37.5, 45, 57.5],
  [52, 27.5, 35, 37.5, 50, 62.5],
  [56, 30, 37.5, 40, 52.5, 65],
  [60, 32.5, 40, 42.5, 57.5, 67.5],
  [67, 35, 40, 47.5, 62.5, 75],
  [75, 37.5, 42.5, 52.5, 65, 85],
  [82, 37.5, 50, 55, 72.5, 90],
  [90, 40, 52.5, 60, 75, 95],
  [90, 42.5, 55, 62.5, 80, 100],
]);

const DEADLIFT_MEN = grid([
  [52, 42.5, 82.5, 92.5, 135, 175],
  [56, 47.5, 87.5, 100, 145, 187.5],
  [60, 50, 95, 110, 155, 200],
  [67, 57.5, 107.5, 122.5, 172.5, 217.5],
  [75, 62.5, 115, 135, 185, 235],
  [82, 67.5, 125, 142.5, 200, 250],
  [90, 70, 132.5, 152.5, 207.5, 257.5],
  [100, 75, 137.5, 160, 217.5, 265],
  [110, 77.5, 145, 165, 222.5, 270],
  [125, 80, 147.5, 170, 227.5, 272.5],
  [145, 82.5, 152.5, 172.5, 230, 277.5],
  [145, 85, 155, 177.5, 232.5, 280],
]);

const DEADLIFT_WOMEN = grid([
  [44, 25, 47.5, 50, 80, 105],
  [48, 27.5, 52.5, 60, 85, 110],
  [52, 30, 55, 62.5, 90, 115],
  [56, 32.5, 60, 67.5, 95, 120],
  [60, 35, 62.5, 72.5, 100, 125],
  [67, 37.5, 67.5, 80, 110, 135],
  [75, 40, 72.5, 85, 117.5, 145],
  [82, 42.5, 80, 92.5, 125, 150],
  [90, 45, 87.5, 97.5, 130, 160],
  [90, 50, 90, 105, 137.5, 165],
]);

const PRESS_MEN = grid([
  [52, 22.5, 32.5, 40, 50, 60],
  [56, 25, 35, 45, 52.5, 65],
  [60, 27.5, 37.5, 47.5, 57.5, 70],
  [67, 30, 42.5, 55, 62.5, 77.5],
  [75, 32.5, 45, 57.5, 70, 85],
  [82, 35, 50, 62.5, 75, 100],
  [90, 37.5, 52.5, 65, 77.5, 105],
  [100, 40, 55, 70, 82.5, 115],
  [110, 42.5, 57.5, 72.5, 85, 120],
  [125, 42.5, 60, 75, 87.5, 122.5],
  [145, 45, 60, 75, 90, 125],
  [145, 45, 62.5, 77.5, 92.5, 130],
]);

const PRESS_WOMEN = grid([
  [44, 15, 17.5, 22.5, 30, 40],
  [48, 15, 20, 25, 32.5, 42.5],
  [52, 17.5, 22.5, 27.5, 35, 45],
  [56, 17.5, 22.5, 27.5, 37.5, 47.5],
  [60, 17.5, 25, 30, 40, 50],
  [67, 20, 27.5, 32.5, 42.5, 55],
  [75, 22.5, 30, 35, 47.5, 62.5],
  [82, 22.5, 32.5, 37.5, 50, 65],
  [90, 25, 35, 40, 52.5, 67.5],
  [90, 27.5, 37.5, 42.5, 57.5, 72.5],
]);

const TABLES: Record<string, { female: StandardRow[]; male: StandardRow[] }> = {
  "back-squat": { female: SQUAT_WOMEN, male: SQUAT_MEN },
  "barbell-bench-press": { female: BENCH_WOMEN, male: BENCH_MEN },
  deadlift: { female: DEADLIFT_WOMEN, male: DEADLIFT_MEN },
  "overhead-press": { female: PRESS_WOMEN, male: PRESS_MEN },
};

const EXRX_TABLE_URLS: Record<string, string> = {
  "back-squat": "https://exrx.net/Testing/WeightLifting/SquatStandardsKg",
  "barbell-bench-press": "https://exrx.net/Testing/WeightLifting/BenchStandardsKg",
  deadlift: "https://exrx.net/Testing/WeightLifting/DeadliftStandardsKg",
  "overhead-press": "https://exrx.net/Testing/WeightLifting/PressStandardsKg",
};

export function exrxTableUrl(slug: string): string | null {
  return EXRX_TABLE_URLS[slug] ?? null;
}

export function isPublicStandardLift(slug: string): boolean {
  return slug in TABLES;
}

function thresholdsAt(rows: StandardRow[], bodyweightKg: number): LevelKg {
  if (bodyweightKg <= rows[0].bodyweightKg) {
    return rows[0].levels;
  }
  const finite = rows.filter((row) => !row.openEnded);
  const lastFinite = finite[finite.length - 1];
  if (bodyweightKg > lastFinite.bodyweightKg) {
    return rows[rows.length - 1].levels;
  }
  for (let index = 0; index < finite.length - 1; index += 1) {
    const left = finite[index];
    const right = finite[index + 1];
    if (bodyweightKg > right.bodyweightKg) {
      continue;
    }
    const span = right.bodyweightKg - left.bodyweightKg;
    const t = span === 0 ? 0 : (bodyweightKg - left.bodyweightKg) / span;
    return left.levels.map((value, levelIndex) => value + (right.levels[levelIndex] - value) * t) as LevelKg;
  }
  return lastFinite.levels;
}

export function classifyExrxLift(
  slug: string,
  e1rmKg: number,
  sex: "female" | "male",
  bodyweightKg: number,
): ExrxLevel | null {
  const table = TABLES[slug]?.[sex];
  if (!table || !Number.isFinite(e1rmKg) || e1rmKg <= 0 || !Number.isFinite(bodyweightKg) || bodyweightKg <= 0) {
    return null;
  }
  const levels = thresholdsAt(table, bodyweightKg);
  let label: ExrxLevel = "Under the untrained mark";
  for (let index = 0; index < levels.length; index += 1) {
    if (e1rmKg + 0.05 >= levels[index]) {
      label = LEVELS[index];
    }
  }
  return label;
}

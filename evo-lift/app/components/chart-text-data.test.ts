import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  compactActivityChartText,
  compoundE1rmChartText,
  exerciseE1rmChartText,
  exerciseVolumeChartText,
  exerciseWeightChartText,
  heatmapActivityChartText,
  insightsWeeklyChartText,
} from "./chart-text-data";
import type { ExerciseSessionE1rmChartPoint } from "@/lib/exercise-session-e1rm-chart";
import type { ExerciseSessionVolumeChartPoint } from "@/lib/exercise-session-volume-chart";
import type { ExerciseSessionWeightChartPoint } from "@/lib/exercise-session-weight-chart";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function weightPoint(
  overrides: Partial<ExerciseSessionWeightChartPoint> = {},
): ExerciseSessionWeightChartPoint {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    xKey: "2026-10-14T10:00:00Z",
    xTickLabel: "Oct 14",
    heaviestTotalKg: 100,
    heaviestLoadedKg: 80,
    baseKg: 20,
    heaviestSetNumber: 3,
    ...overrides,
  };
}

function e1rmPoint(
  overrides: Partial<ExerciseSessionE1rmChartPoint> = {},
): ExerciseSessionE1rmChartPoint {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    xKey: "2026-10-14T10:00:00Z",
    xTickLabel: "Oct 14",
    e1rmKg: 106.7,
    sourceSetNumber: 2,
    sourceReps: 5,
    sourceTotalKg: 100,
    sourceLoadedKg: 80,
    ...overrides,
  };
}

describe("exercise chart text alternatives", () => {
  it("names the series on screen for loaded, total, both, and assistance", () => {
    const points = [
      weightPoint(),
      weightPoint({
        sessionId: "s2",
        xTickLabel: "Oct 16",
        heaviestLoadedKg: 82.5,
        heaviestTotalKg: 102.5,
      }),
    ];

    const loaded = exerciseWeightChartText(points, "loaded", false);
    assert.equal(loaded.caption, "Loaded (kg) by session");
    assert.deepEqual(
      loaded.columns.map((column) => column.label),
      ["Session", "Loaded (kg)"],
    );
    assert.equal(loaded.rows[1]?.cells.loaded, "82.5");
    assert.equal(loaded.rows[1]?.cells.session, "Oct 16");

    const total = exerciseWeightChartText(points, "total", false);
    assert.equal(total.caption, "Total (kg) by session");
    assert.deepEqual(
      total.columns.map((column) => column.label),
      ["Session", "Total (kg)"],
    );
    assert.equal(total.rows[0]?.cells.total, "100.0");

    const both = exerciseWeightChartText(points, "both", false);
    assert.equal(both.caption, "Loaded (kg) and Total (kg) by session");
    assert.deepEqual(
      both.columns.map((column) => column.label),
      ["Session", "Loaded (kg)", "Total (kg)"],
    );

    const assistance = exerciseWeightChartText(points, "both", true);
    assert.equal(assistance.caption, "Assistance (kg) by session");
    assert.deepEqual(
      assistance.columns.map((column) => column.label),
      ["Session", "Assistance (kg)"],
    );
    assert.equal(assistance.rows[0]?.cells.loaded, "80.0");
  });

  it("lists estimated 1RM and session volume with the axis label", () => {
    const e1rm = exerciseE1rmChartText([e1rmPoint()]);
    assert.equal(e1rm.caption, "Estimated 1RM (kg) by session");
    assert.equal(e1rm.rows[0]?.cells.session, "Oct 14");
    assert.equal(e1rm.rows[0]?.cells.e1rm, "106.7");

    const volume = exerciseVolumeChartText([
      {
        sessionId: "s1",
        performedOn: "2026-10-14",
        sessionCreatedAt: "2026-10-14T10:00:00Z",
        xKey: "2026-10-14T10:00:00Z",
        xTickLabel: "Oct 14",
        volumeKg: 1500.5,
        workingSetsIncluded: 4,
      } satisfies ExerciseSessionVolumeChartPoint,
    ]);
    assert.equal(volume.caption, "Session volume (kg) by session");
    assert.equal(volume.rows[0]?.cells.volume, "1500.5");
  });
});

describe("insights chart text alternatives", () => {
  it("lists the bar value and says when the 4-week average is not drawn yet", () => {
    const model = insightsWeeklyChartText(
      [
        {
          weekStart: "2026-09-01",
          volumeKg: 1000.25,
          workingSets: 12,
          sessionCount: 2,
          movingAverage: null,
        },
        {
          weekStart: "2026-09-08",
          volumeKg: 800,
          workingSets: 9.2,
          sessionCount: 3,
          movingAverage: 10.456,
        },
      ],
      "workingSets",
    );
    assert.equal(model.caption, "Working sets by week");
    assert.equal(
      model.rows[0]?.cells.week,
      `Week of ${new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date("2026-09-01T00:00:00"))}`,
    );
    assert.equal(model.rows[0]?.cells.value, "12");
    assert.equal(model.rows[0]?.cells.average, "Not enough weeks");
    assert.equal(model.rows[1]?.cells.value, "9");
    assert.equal(model.rows[1]?.cells.average, "10.5");

    const volume = insightsWeeklyChartText(
      [
        {
          weekStart: "2026-09-08",
          volumeKg: 800.2,
          workingSets: 9,
          sessionCount: 3,
          movingAverage: 750.24,
        },
      ],
      "volume",
    );
    assert.equal(volume.caption, "Volume (kg) by week");
    assert.equal(volume.rows[0]?.cells.value, "800.2");
    assert.equal(volume.rows[0]?.cells.average, "750.2");

    const sessions = insightsWeeklyChartText(
      [
        {
          weekStart: "2026-09-08",
          volumeKg: 0,
          workingSets: 0,
          sessionCount: 3,
          movingAverage: 2,
        },
      ],
      "sessions",
    );
    assert.equal(sessions.caption, "Sessions by week");
    assert.equal(sessions.rows[0]?.cells.value, "3");
  });

  it("names the lift on a compound estimated 1RM chart", () => {
    const model = compoundE1rmChartText("Squat", [e1rmPoint()]);
    assert.equal(model.caption, "Estimated 1RM (kg) for Squat");
    assert.equal(model.rows[0]?.cells.e1rm, "106.7");
  });
});

describe("home activity chart text alternatives", () => {
  it("lists weekly set counts, including this week", () => {
    const model = compactActivityChartText([
      { weekStart: "2026-09-29", weekLabel: "Sep 29-Oct 5", sets: 20 },
      { weekStart: "2026-10-06", weekLabel: "This week", sets: 8 },
    ]);
    assert.equal(model.caption, "Sets by week");
    assert.deepEqual(
      model.rows.map((row) => row.cells),
      [
        { week: "Sep 29-Oct 5", sets: "20" },
        { week: "This week", sets: "8" },
      ],
    );
  });

  it("lists in-range days with status text, today, and a reached goal", () => {
    const model = heatmapActivityChartText(
      [
        {
          date: "2026-10-12",
          sets: 0,
          workouts: 0,
          isInRange: false,
          isCurrentWeek: true,
          isToday: false,
        },
        {
          date: "2026-10-13",
          sets: 0,
          workouts: 1,
          isInRange: true,
          isCurrentWeek: true,
          isToday: false,
        },
        {
          date: "2026-10-14",
          sets: 12,
          workouts: 1,
          isInRange: true,
          isCurrentWeek: true,
          isToday: true,
        },
      ],
      { "2026-10-14": "Squat 100 kg" },
    );
    assert.equal(model.rows.length, 2);
    assert.equal(model.rows[0]?.cells.status, "No Sets");
    assert.match(model.rows[0]?.cells.day ?? "", /This week/);
    assert.equal(model.rows[1]?.cells.sets, "12");
    assert.equal(model.rows[1]?.cells.workouts, "1");
    assert.match(model.rows[1]?.cells.day ?? "", /This week · Today/);
    assert.equal(model.rows[1]?.cells.status, "Workout · Goal reached: Squat 100 kg");
  });
});

describe("chart text alternative wiring", () => {
  const chartFiles = [
    "exercise-weight-progress-chart.tsx",
    "exercise-session-e1rm-chart.tsx",
    "exercise-session-volume-chart.tsx",
    "insights-weekly-volume-chart.tsx",
    "insights-compound-e1rm-chart.tsx",
    "workout-activity-chart.tsx",
  ];

  it("gives each chart a data table and does not use the SVG as the text alternative", () => {
    for (const fileName of chartFiles) {
      const source = readFileSync(join(componentsDir, fileName), "utf8");
      assert.match(source, /accessibilityLayer=\{false\}/);
      assert.match(source, /ChartTextAlternative/);
      assert.doesNotMatch(source, /role="img"/);
    }

    const pace = readFileSync(join(componentsDir, "exercise-progress-pace-chart.tsx"), "utf8");
    assert.match(pace, /accessibilityLayer=\{false\}/);
    assert.match(pace, /aria-label="Pace mix"/);
    assert.doesNotMatch(pace, /role="img"/);

    const table = readFileSync(join(componentsDir, "chart-text-alternative.tsx"), "utf8");
    assert.match(table, /<table/);
    assert.match(table, /<caption className="sr-only">/);
    assert.doesNotMatch(table, /role="img"/);

    const activity = readFileSync(join(componentsDir, "workout-activity-chart.tsx"), "utf8");
    assert.match(activity, /tabIndex=\{canOpen \? 0 : undefined\}/);
    assert.match(activity, /focus-visible:ring-sky-700/);

    const css = readFileSync(join(componentsDir, "..", "globals.css"), "utf8");
    assert.doesNotMatch(css, /\.compact-activity-chart :focus-visible/);
    assert.doesNotMatch(css, /\.insights-weekly-chart :focus-visible/);
    assert.doesNotMatch(css, /\.exercise-weight-progress-chart :focus-visible/);
  });
});

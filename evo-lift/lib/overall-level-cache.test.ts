import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import type { ExerciseWorkingSetSample, UserStrengthProfile } from "@/lib/insights-data";
import { invalidateInsightsHistory } from "@/lib/insights-data";
import {
  cachedOverallLevelCoversRange,
  exerciseProgressWithCachedLevel,
  invalidateOverallLevelCache,
  invalidateOverallLevelCacheForSlugs,
  loadOverallLevelCache,
  overallLevelSnapshotFromInputs,
  peekOverallLevelCache,
  rememberOverallLevelCache,
} from "./overall-level-cache";
import { profileOverallLevel } from "./profile-overall-level";

const PROFILE: UserStrengthProfile = {
  sex: "male",
  bodyweightKg: 75,
  bodyweightEntries: [],
  dateOfBirth: "1996-01-01",
  birthYear: null,
};

function lift(slug: string, label: string, totalKg: number, performedOn: string): ExerciseWorkingSetSample {
  return {
    exerciseId: `ex-${slug}`,
    slug,
    label,
    sessionId: slug,
    performedOn,
    reps: 1,
    loadedKg: totalKg,
    totalKg,
  };
}

const samples = [
  lift("back-squat", "Barbell Back Squat", 202.5, "2026-02-01"),
  lift("barbell-bench-press", "Barbell Bench Press", 70, "2026-02-01"),
  lift("deadlift", "Barbell Deadlift", 185, "2026-02-01"),
  lift("overhead-press", "Barbell Overhead Press", 32.5, "2026-01-03"),
];

function storage() {
  const saved = new Map<string, string>();
  return {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
    removeItem: (key: string) => {
      saved.delete(key);
    },
  };
}

function emptyClient() {
  return {
    from() {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "gte", "lte", "in", "range"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled);
      return builder;
    },
  };
}

describe("overall level cache", () => {
  beforeEach(() => {
    invalidateOverallLevelCache();
    invalidateInsightsHistory();
    Object.assign(globalThis, { window: { localStorage: storage() } });
  });

  it("stores the same overall level Home and Profile already share", () => {
    const snapshot = overallLevelSnapshotFromInputs({
      samples,
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    const level = profileOverallLevel({
      samples,
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    assert.equal(snapshot.asOf, "2026-03-01");
    assert.equal(snapshot.level.overall?.badge, level.overall?.badge);
    assert.deepEqual(snapshot.level.overall?.progress, level.overall?.progress);
    assert.deepEqual(snapshot.level.overall?.lifts, level.overall?.lifts);
    assert.ok(snapshot.publicNotes.length >= 3);
    assert.ok(snapshot.recentPublicNotes.length >= 3);
  });

  it("returns the saved level for that lifter and drops it for a main lift or bodyweight change", () => {
    const snapshot = overallLevelSnapshotFromInputs({
      samples,
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    rememberOverallLevelCache("user-1", snapshot);
    assert.equal(peekOverallLevelCache("user-1")?.level.overall?.badge, snapshot.level.overall?.badge);
    assert.equal(peekOverallLevelCache("user-2"), null);

    invalidateOverallLevelCacheForSlugs(["ez-bar-curl"]);
    assert.ok(peekOverallLevelCache("user-1"));
    invalidateOverallLevelCacheForSlugs(["deadlift"]);
    assert.equal(peekOverallLevelCache("user-1"), null);

    rememberOverallLevelCache("user-1", snapshot);
    invalidateOverallLevelCache();
    assert.equal(peekOverallLevelCache("user-1"), null);
  });

  it("reads the level back from storage after the tab memory is cleared", () => {
    const snapshot = overallLevelSnapshotFromInputs({
      samples,
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    rememberOverallLevelCache("user-1", snapshot);
    invalidateOverallLevelCache();
    const raw = window.localStorage.getItem("evolift.overall-level.v1");
    assert.equal(raw, null);
    window.localStorage.setItem(
      "evolift.overall-level.v1",
      JSON.stringify({ userId: "user-1", ...snapshot }),
    );
    assert.equal(peekOverallLevelCache("user-1")?.asOf, "2026-03-01");
    assert.equal(peekOverallLevelCache("user-2"), null);
  });

  it("covers a range that ends today and includes the last 8 weeks", () => {
    assert.equal(cachedOverallLevelCoversRange("2026-03-01", { from: "", to: "2026-03-01" }), true);
    assert.equal(
      cachedOverallLevelCoversRange("2026-03-01", { from: "2025-12-01", to: "2026-03-01" }),
      true,
    );
    assert.equal(
      cachedOverallLevelCoversRange("2026-03-01", { from: "2026-02-15", to: "2026-03-01" }),
      false,
    );
    assert.equal(cachedOverallLevelCoversRange("2026-03-01", { from: "", to: "2026-02-01" }), false);
  });

  it("keeps the selected range history and uses the cached overall level", () => {
    const snapshot = overallLevelSnapshotFromInputs({
      samples,
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    const report = {
      summary: "Range",
      rows: [],
      balanceNotes: [],
      publicNotes: [],
      overallLevel: snapshot.level.overall
        ? { ...snapshot.level.overall, badge: "Novice", history: [{ asOf: "2026-02-01", badge: "Novice" }] }
        : null,
      comparisonHint: null,
      standardsCaption: null,
    };
    const merged = exerciseProgressWithCachedLevel(report, snapshot, { from: "2025-12-01", to: "2026-03-01" });
    assert.equal(merged.overallLevel?.badge, snapshot.level.overall?.badge);
    assert.deepEqual(merged.overallLevel?.history, report.overallLevel?.history);
    assert.equal(merged.publicNotes.length, 0);
    const cutoff = new Date(Date.UTC(2026, 2, 1));
    cutoff.setUTCDate(cutoff.getUTCDate() - 56);
    const recent = exerciseProgressWithCachedLevel(report, snapshot, {
      from: cutoff.toISOString().slice(0, 10),
      to: "2026-03-01",
    });
    assert.equal(recent.publicNotes.length, snapshot.recentPublicNotes.length);
    const allTime = exerciseProgressWithCachedLevel(report, snapshot, { from: "", to: "2026-03-01" });
    assert.equal(allTime.publicNotes.length, snapshot.publicNotes.length);
  });

  it("keeps today's saved level instead of loading again", async () => {
    const snapshot = overallLevelSnapshotFromInputs({
      samples,
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    rememberOverallLevelCache("user-1", snapshot);
    const loaded = await loadOverallLevelCache(emptyClient() as never, "user-1", "2026-03-01");
    assert.equal(loaded.level.overall?.badge, snapshot.level.overall?.badge);
  });
});

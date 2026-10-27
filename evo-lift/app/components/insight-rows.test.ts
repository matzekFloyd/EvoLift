import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ExerciseProgressRow, LiftBalanceNote, ProgressRead } from "@/lib/exercise-progress-insights";
import {
  bestInRangeMeta,
  comparisonBadgeDescription,
  comparisonBadgeTone,
  comparisonInsightRow,
  estimateChangeMark,
  exerciseDetailRankRow,
  exerciseLeadDetail,
  progressBadgeDescription,
  progressInsightRow,
  progressReadBadgeTone,
} from "./insight-rows";

function progressRow(read: ProgressRead, partial: Partial<ExerciseProgressRow> = {}): ExerciseProgressRow {
  return {
    exerciseId: "ex-1",
    slug: "back-squat",
    label: "Barbell Back Squat",
    sessionCount: 4,
    latestE1rmKg: 100,
    bestE1rmKg: 100,
    changeKg: 2.5,
    read,
    detail: "Detail for this lift.",
    ...partial,
    bestPerformedOn: partial.bestPerformedOn ?? null,
  };
}

function note(partial: Partial<LiftBalanceNote> & Pick<LiftBalanceNote, "badge" | "kind">): LiftBalanceNote {
  return {
    id: partial.badge,
    slugs: [],
    title: "Barbell Back Squat",
    titleSlug: "back-squat",
    detail: "Compared with the other lift.",
    tableHref: null,
    meta: null,
    ...partial,
  };
}

describe("progress insight rows", () => {
  it("maps each read to a badge tone and description", () => {
    assert.equal(progressReadBadgeTone("ahead"), "success");
    assert.equal(progressReadBadgeTone("on-track"), "info");
    assert.equal(progressReadBadgeTone("room"), "warning");
    assert.equal(progressReadBadgeTone("down"), "warning");
    assert.equal(progressReadBadgeTone("early"), "neutral");
    assert.match(progressBadgeDescription("ahead"), /faster than a steady coaching pace/);
    assert.match(progressBadgeDescription("on-track"), /keeping up with a steady coaching pace/);
    assert.match(progressBadgeDescription("room"), /behind a steady coaching pace/);
    assert.match(progressBadgeDescription("down"), /at least 2\.5 kg below/);
    assert.match(progressBadgeDescription("early"), /no pace yet/);
  });

  it("links the exercise and shows the latest estimate, unless the row is not linked or still early", () => {
    const linked = progressInsightRow(progressRow("ahead"));
    assert.equal(linked.badge, "Ahead");
    assert.equal(linked.title, "Barbell Back Squat");
    assert.equal(linked.slug, "back-squat");
    assert.equal(linked.href, "/app/exercises/back-squat");
    assert.equal(progressInsightRow(progressRow("ahead"), { omitTitle: true }).title, null);
    assert.equal(progressInsightRow(progressRow("ahead"), { omitTitle: true }).slug, null);
    assert.deepEqual(estimateChangeMark("Latest est. 1RM 93.3 kg · -35.0 kg"), {
      lead: "Latest est. 1RM 93.3 kg",
      direction: "down",
      amount: "35.0 kg",
    });
    assert.deepEqual(estimateChangeMark("Latest est. 1RM 100.0 kg · +2.5 kg"), {
      lead: "Latest est. 1RM 100.0 kg",
      direction: "up",
      amount: "2.5 kg",
    });
    assert.equal(estimateChangeMark("Best est. 1RM 100.0 kg · 1.3× bodyweight"), null);
    assert.equal(
      exerciseLeadDetail(
        "Over 8 sessions since the first session in this range. Best in this range was 164.7 kg.",
        true,
      ),
      "",
    );
    assert.equal(
      exerciseLeadDetail(
        "Over 8 sessions since the first session in this range. Best in this range was 164.7 kg.",
        false,
      ),
      "Best in this range was 164.7 kg.",
    );
    assert.equal(
      exerciseLeadDetail("Over 4 sessions. A steady rate for this lift is about 1.0 kg per month.", false),
      "Over 4 sessions. A steady rate for this lift is about 1.0 kg per month.",
    );
    assert.equal(
      bestInRangeMeta("Best est. 1RM 164.7 kg · 1.9× bodyweight"),
      "Best in this range, 164.7 kg at 1.9× bodyweight",
    );
    assert.equal(linked.meta, "Latest est. 1RM 100.0 kg · +2.5 kg");
    assert.equal(progressInsightRow(progressRow("down", { changeKg: -3 }), { link: false }).href, null);
    assert.equal(
      progressInsightRow(progressRow("down", { changeKg: -3 })).meta,
      "Latest est. 1RM 100.0 kg · -3.0 kg",
    );
    assert.equal(progressInsightRow(progressRow("early", { changeKg: 4 })).meta, "Latest est. 1RM 100.0 kg");
    assert.equal(progressInsightRow(progressRow("ahead", { latestE1rmKg: null })).meta, null);
  });
});

describe("comparison insight rows", () => {
  it("maps balance and ExRx badges to tone and description", () => {
    assert.equal(comparisonBadgeTone(note({ kind: "balance", badge: "Below usual" })), "warning");
    assert.match(comparisonBadgeDescription(note({ kind: "balance", badge: "Below usual" })), /outside the usual ratio/);
    assert.match(comparisonBadgeDescription(note({ kind: "public", badge: "Missing" })), /none of them appear/);
    assert.match(comparisonBadgeDescription(note({ kind: "public", badge: "Untrained" })), /Below the ExRx novice/);
    assert.equal(comparisonBadgeTone(note({ kind: "public", badge: "Untrained" })), "neutral");
    assert.equal(comparisonBadgeTone(note({ kind: "public", badge: "Novice" })), "info");
    assert.equal(comparisonBadgeTone(note({ kind: "public", badge: "Intermediate" })), "info");
    assert.equal(comparisonBadgeTone(note({ kind: "public", badge: "Advanced" })), "success");
    assert.equal(comparisonBadgeTone(note({ kind: "public", badge: "Elite" })), "success");
    const detailRank = exerciseDetailRankRow(
      note({
        kind: "public",
        badge: "Elite",
        meta: "Best est. 1RM 164.7 kg · 1.9× bodyweight",
      }),
    );
    assert.equal(detailRank.badgeTone, "neutral");
    assert.equal(detailRank.quiet, true);
    assert.equal(detailRank.title, null);
    assert.equal(detailRank.slug, null);
    assert.equal(detailRank.meta, "Best in this range, 164.7 kg at 1.9× bodyweight");
    assert.match(
      comparisonBadgeDescription(note({ kind: "public", badge: "Elite" })),
      /Elite is the highest ExRx standard/,
    );
    assert.match(
      comparisonBadgeDescription(note({ kind: "public", badge: "Other" })),
      /Compared with the ExRx standards/,
    );
  });

  it("links a named exercise and keeps the note's detail", () => {
    const row = comparisonInsightRow(
      note({ kind: "public", badge: "Novice", tableHref: "https://exrx.net/Testing", meta: "80 kg" }),
    );
    assert.equal(row.href, "/app/exercises/back-squat");
    assert.equal(row.slug, "back-squat");
    assert.equal(row.badge, "Novice");
    assert.equal(row.tableHref, "https://exrx.net/Testing");
    assert.equal(row.meta, "80 kg");
    assert.equal(comparisonInsightRow(note({ kind: "public", badge: "Novice", titleSlug: null })).href, null);
    assert.equal(comparisonInsightRow(note({ kind: "public", badge: "Novice", titleSlug: null })).slug, null);
  });
});

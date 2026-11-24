import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  REPORT_BUSY_MESSAGE,
  REPORT_FAILED_MESSAGE,
  REPORT_MEDICAL_LINE,
  REPORT_MIN_SESSIONS,
  REPORT_PAGE_ONLY_MESSAGE,
  REPORT_PAUSED_MESSAGE,
  REPORT_TOO_FEW_SESSIONS_MESSAGE,
  REPORT_UNAVAILABLE_MESSAGE,
  buildReportFacts,
  buildReportSummary,
  attachReportSummary,
  readReportSummary,
  reportKindFromBody,
  reportAllowancePaused,
  reportCooldownMessage,
  reportCreateFromSession,
  reportGatewayFailure,
  reportNextCreateAt,
  reportSpendableUsd,
  reportParagraphs,
  reportPeriodEnding,
  reportTodayAccepted,
  sessionCountsForReport,
  trainingReportInstructions,
  withMedicalLine,
  type ReportSession,
} from "./training-report";

function session(overrides: Partial<ReportSession> = {}): ReportSession {
  return {
    performedOn: "2026-11-20",
    notes: null,
    completed: false,
    exercises: [
      {
        name: "Squat",
        notes: null,
        notDone: false,
        targetSets: 3,
        targetReps: 8,
        targetWeightKg: 55,
        baseWeightKg: null,
        sets: [{ reps: 8, weightKg: 55, warmup: false }],
      },
    ],
    ...overrides,
  };
}

describe("training report", () => {
  it("covers the last 4 weeks through today", () => {
    assert.deepEqual(reportPeriodEnding("2026-11-23"), {
      from: "2026-10-27",
      to: "2026-11-23",
    });
  });

  it("accepts a client date one day from the server date", () => {
    assert.equal(reportTodayAccepted("2026-11-23", "2026-11-23"), true);
    assert.equal(reportTodayAccepted("2026-11-22", "2026-11-23"), true);
    assert.equal(reportTodayAccepted("2026-11-20", "2026-11-23"), false);
  });

  it("counts a working set or a finished session, and ignores a warmup-only draft", () => {
    assert.equal(sessionCountsForReport(session()), true);
    assert.equal(
      sessionCountsForReport(
        session({
          completed: true,
          exercises: [
            {
              name: "Squat",
              notes: null,
              notDone: false,
              targetSets: null,
              targetReps: null,
              targetWeightKg: null,
              baseWeightKg: null,
              sets: [],
            },
          ],
        }),
      ),
      true,
    );
    assert.equal(
      sessionCountsForReport(
        session({
          exercises: [
            {
              name: "Squat",
              notes: null,
              notDone: false,
              targetSets: null,
              targetReps: null,
              targetWeightKg: null,
              baseWeightKg: null,
              sets: [{ reps: 5, weightKg: 20, warmup: true }],
            },
          ],
        }),
      ),
      false,
    );
    assert.equal(REPORT_MIN_SESSIONS, 2);
    assert.match(REPORT_TOO_FEW_SESSIONS_MESSAGE, /two sessions/);
  });

  it("keeps the brief to what changed, what stalled, and what to watch", () => {
    const squat = (on: string, weight: number, lastReps: number): ReportSession =>
      session({
        performedOn: on,
        exercises: [
          {
            name: "Squat",
            notes: null,
            notDone: false,
            targetSets: 3,
            targetReps: 5,
            targetWeightKg: weight,
            baseWeightKg: 20,
            sets: [
              { reps: 5, weightKg: 40, warmup: true },
              { reps: 5, weightKg: weight, warmup: false },
              { reps: 5, weightKg: weight, warmup: false },
              { reps: lastReps, weightKg: weight, warmup: false },
            ],
          },
        ],
      });
    const facePull = (on: string): ReportSession =>
      session({
        performedOn: on,
        exercises: [
          {
            name: "Face pull",
            notes: null,
            notDone: false,
            targetSets: 3,
            targetReps: 12,
            targetWeightKg: 15,
            baseWeightKg: null,
            sets: [
              { reps: 12, weightKg: 15, warmup: false },
              { reps: 12, weightKg: 15, warmup: false },
              { reps: 12, weightKg: 15, warmup: false },
            ],
          },
        ],
      });
    const facts = buildReportFacts({
      from: "2026-10-27",
      to: "2026-11-23",
      sessions: [
        session({
          performedOn: "2026-10-29",
          notes: "Report sample: press — Left wrist sore",
          exercises: [
            {
              name: "Squat",
              notes: "knees fine",
              notDone: false,
              targetSets: 3,
              targetReps: 5,
              targetWeightKg: 100,
              baseWeightKg: 20,
              sets: [
                { reps: 5, weightKg: 40, warmup: true },
                { reps: 5, weightKg: 100, warmup: false },
                { reps: 5, weightKg: 100, warmup: false },
                { reps: 5, weightKg: 100, warmup: false },
              ],
            },
            {
              name: "Lat pulldown",
              notes: "Shoulder felt tight.",
              notDone: true,
              targetSets: 3,
              targetReps: 10,
              targetWeightKg: 55,
              baseWeightKg: null,
              sets: [],
            },
            {
              name: "Leg extension",
              notes: null,
              notDone: false,
              targetSets: 3,
              targetReps: 12,
              targetWeightKg: 45,
              baseWeightKg: null,
              sets: [
                { reps: 12, weightKg: 45, warmup: false },
                { reps: 12, weightKg: 45, warmup: false },
                { reps: 12, weightKg: 45, warmup: false },
              ],
            },
          ],
        }),
        squat("2026-11-18", 110, 4),
        facePull("2026-10-30"),
        facePull("2026-11-08"),
        facePull("2026-11-19"),
        session({
          performedOn: "2026-11-23",
          notes: null,
          exercises: [
            {
              name: "Curl",
              notes: null,
              notDone: false,
              targetSets: 3,
              targetReps: 8,
              targetWeightKg: 16,
              baseWeightKg: null,
              sets: [
                { reps: 8, weightKg: 16, warmup: false },
                { reps: 8, weightKg: 16, warmup: false },
                { reps: 7, weightKg: 16, warmup: false },
              ],
            },
          ],
        }),
      ],
    });

    assert.match(facts, /Sessions: 6/);
    assert.match(facts, /Squat: 100 kg × 5 on 29 Oct to 110 kg × 5 on 18 Nov/);
    assert.match(facts, /Best estimated 1RM in this window, 151\.7 kg, above 140\.0 kg earlier/);
    assert.match(facts, /Face pull stayed at 15 kg × 12 across 3 sessions/);
    assert.match(facts, /Lat pulldown skipped once\. Shoulder felt tight/);
    assert.match(facts, /Squat on 18 Nov: 110 kg × 4 on a working set, target 5 reps/);
    assert.match(facts, /Curl on 23 Nov: 16 kg × 7 on a working set, target 8 reps/);
    assert.match(facts, /29 Oct: Left wrist sore/);
    assert.match(facts, /29 Oct: Squat: knees fine/);
    assert.doesNotMatch(facts, /working volume/);
    assert.doesNotMatch(facts, /Leg extension/);
    assert.doesNotMatch(facts, /Report sample/);
    assert.doesNotMatch(facts, /40 kg/);
    assert.doesNotMatch(facts, /body weight|sex|age/i);
  });

  it("saves the lift table with the report text and hides it from the paragraphs", () => {
    const summary = buildReportSummary({
      from: "2026-10-27",
      to: "2026-11-23",
      sessions: [
        session({
          performedOn: "2026-10-29",
          exercises: [
            {
              name: "Squat",
              notes: null,
              notDone: false,
              targetSets: 3,
              targetReps: 5,
              targetWeightKg: 100,
              baseWeightKg: null,
              sets: [{ reps: 5, weightKg: 100, warmup: false }],
            },
          ],
        }),
        session({
          performedOn: "2026-11-18",
          exercises: [
            {
              name: "Squat",
              notes: null,
              notDone: false,
              targetSets: 3,
              targetReps: 5,
              targetWeightKg: 110,
              baseWeightKg: null,
              sets: [{ reps: 5, weightKg: 110, warmup: false }],
            },
          ],
        }),
      ],
    });
    assert.equal(summary.sessions, 2);
    assert.deepEqual(summary.lifts[0], {
      name: "Squat",
      earlier: "100 kg × 5",
      latest: "110 kg × 5",
      change: "+10 kg",
      direction: "up",
      logged: null,
      heaviest: null,
    });

    const saved = attachReportSummary("Squat moved up.\n\nSuggestions come from logged training and are not medical advice.", summary);
    const read = readReportSummary(saved);
    assert.equal(read.summary?.lifts[0]?.change, "+10 kg");
    assert.deepEqual(reportParagraphs(read.prose), [
      "Squat moved up.",
      "Suggestions come from logged training and are not medical advice.",
    ]);
    assert.equal(readReportSummary("Older report with no table.").summary, null);
    assert.equal(readReportSummary(saved).summary?.kind, "recent");
  });

  it("summarizes all logged training by estimated 1RM, and keeps a long break", () => {
    const squat = (on: string, weight: number): ReportSession =>
      session({
        performedOn: on,
        exercises: [
          {
            name: "Squat",
            notes: null,
            notDone: false,
            targetSets: 3,
            targetReps: 5,
            targetWeightKg: weight,
            baseWeightKg: 20,
            sets: [{ reps: 5, weightKg: weight, warmup: false }],
          },
        ],
      });
    const input = {
      from: "2026-08-01",
      to: "2026-10-03",
      kind: "all" as const,
      sessions: [squat("2026-08-01", 80), squat("2026-08-22", 90), squat("2026-09-12", 100), squat("2026-10-03", 110)],
    };
    const summary = buildReportSummary(input);
    assert.equal(summary.kind, "all");
    assert.equal(summary.lifts[0]?.change, "+30%");
    assert.equal(summary.lifts[0]?.logged, 4);
    assert.equal(summary.lifts[0]?.earlier, "116.7 kg");
    assert.equal(summary.lifts[0]?.latest, "151.7 kg");
    assert.equal(summary.lifts[0]?.heaviest, "110 kg × 5");
    assert.equal(summary.firstHalfKg, null);
    assert.equal(summary.secondHalfKg, null);
    assert.match(buildReportFacts(input), /All logged training/);
    assert.match(buildReportFacts(input), /Longest break was 21 days, 1 Aug to 22 Aug/);
    assert.equal(reportKindFromBody(undefined), "recent");
    assert.equal(reportKindFromBody("all"), "all");
    assert.equal(reportKindFromBody("year"), null);
  });

  it("treats less assistance as progress, and more assistance as a drop", () => {
    function assisted(on: string, assistanceKg: number, bodyweightKg: number | null): ReportSession {
      return session({
        performedOn: on,
        bodyweightKg,
        exercises: [
          {
            name: "Assisted Dip",
            assistance: true,
            notes: null,
            notDone: false,
            targetSets: 3,
            targetReps: 8,
            targetWeightKg: assistanceKg,
            baseWeightKg: null,
            sets: [
              { reps: 8, weightKg: assistanceKg + 10, warmup: false },
              { reps: 8, weightKg: assistanceKg, warmup: false },
            ],
          },
        ],
      });
    }

    const withoutBodyweight = buildReportSummary({
      from: "2026-08-01",
      to: "2026-10-01",
      kind: "all",
      sessions: [
        assisted("2026-08-01", 50, null),
        assisted("2026-08-20", 40, null),
        assisted("2026-09-10", 30, null),
        assisted("2026-10-01", 20, null),
      ],
    });
    const logged = withoutBodyweight.lifts.find((lift) => lift.name === "Assisted Dip");
    assert.equal(logged?.direction, "up");
    assert.equal(logged?.earlier, "50 kg × 8");
    assert.equal(logged?.latest, "20 kg × 8");
    assert.equal(logged?.change, "-30 kg");
    assert.equal(logged?.heaviest, "20 kg × 8");
    assert.match(buildReportFacts({
      from: "2026-08-01",
      to: "2026-10-01",
      kind: "all",
      sessions: [
        assisted("2026-08-01", 50, null),
        assisted("2026-08-20", 40, null),
        assisted("2026-09-10", 30, null),
        assisted("2026-10-01", 20, null),
      ],
    }), /Less assistance/);

    const withBodyweight = buildReportSummary({
      from: "2026-08-01",
      to: "2026-10-01",
      kind: "all",
      sessions: [
        assisted("2026-08-01", 40, 80),
        assisted("2026-08-20", 30, 80),
        assisted("2026-09-10", 20, 80),
        assisted("2026-10-01", 10, 80),
      ],
    });
    const estimated = withBodyweight.lifts.find((lift) => lift.name === "Assisted Dip");
    assert.equal(estimated?.direction, "up");
    assert.equal(estimated?.earlier, "50.7 kg");
    assert.equal(estimated?.latest, "88.7 kg");
    assert.equal(estimated?.change, "+75%");
    assert.equal(estimated?.heaviest, "10 kg × 8");

    const recent = buildReportSummary({
      from: "2026-10-01",
      to: "2026-10-28",
      sessions: [assisted("2026-10-02", 40, null), assisted("2026-10-20", 20, null)],
    });
    assert.equal(recent.lifts[0]?.direction, "up");
    assert.equal(recent.lifts[0]?.change, "-20 kg");

    const harder = buildReportSummary({
      from: "2026-10-01",
      to: "2026-10-28",
      sessions: [assisted("2026-10-02", 20, null), assisted("2026-10-20", 40, null)],
    });
    assert.equal(harder.lifts[0]?.direction, "down");
    assert.equal(harder.lifts[0]?.change, "+20 kg");
  });

  it("tells the model to write a short recap from the brief", () => {
    const instructions = trainingReportInstructions();
    assert.match(instructions, /two short sentences/);
    assert.match(instructions, /do not repeat those numbers/);
    assert.match(instructions, /Do not mention a lift that is not in the brief/);
    assert.match(instructions, /Do not invent weights/);
    assert.match(instructions, /Do not set the next weight/);
    assert.match(instructions, /not medical advice/);
    assert.doesNotMatch(instructions, /one sentence per exercise/i);
  });

  it("shows an older markdown report as plain paragraphs", () => {
    assert.deepEqual(
      reportParagraphs("**Squat** went up.\n\n* Next: keep the note."),
      ["**Squat** went up.", "Next: keep the note."],
    );
    assert.deepEqual(reportParagraphs("moved **Squat** , and **Deadlift** ."), [
      "moved **Squat**, and **Deadlift**.",
    ]);
  });

  it("adds the medical line when the model leaves it out", () => {
    assert.equal(withMedicalLine("Squat went up."), `Squat went up.\n\n${REPORT_MEDICAL_LINE}`);
    assert.equal(withMedicalLine(`Done. ${REPORT_MEDICAL_LINE}`), `Done. ${REPORT_MEDICAL_LINE}`);
  });

  it("refuses a personal API token", () => {
    assert.equal(reportCreateFromSession(true), false);
    assert.equal(reportCreateFromSession(false), true);
    assert.equal(REPORT_PAGE_ONLY_MESSAGE, "Create a report from the Reports page.");
  });

  it("waits seven days before the same kind of report can be created again", () => {
    const now = new Date("2026-11-24T12:00:00.000Z");
    const saved = (kind: "recent" | "all") =>
      `Recap.\n\n---report-summary---\n${JSON.stringify({ sessions: 2, lifts: [], kind })}`;
    const recent = { report_text: saved("recent"), created_at: "2026-11-18T12:00:00.000Z" };
    const all = { report_text: saved("all"), created_at: "2026-11-20T12:00:00.000Z" };
    assert.equal(reportNextCreateAt([recent], "recent", now)?.toISOString(), "2026-11-25T12:00:00.000Z");
    assert.equal(reportNextCreateAt([recent], "all", now), null);
    assert.equal(reportNextCreateAt([all], "recent", now), null);
    assert.equal(
      reportNextCreateAt([{ report_text: "Older prose only.", created_at: "2026-11-23T12:00:00.000Z" }], "recent", now)?.toISOString(),
      "2026-11-30T12:00:00.000Z",
    );
    assert.equal(reportNextCreateAt([recent], "recent", new Date("2026-11-25T12:00:00.000Z")), null);
    const availableAt = new Date("2026-12-01T12:22:00.000Z");
    assert.equal(
      reportCooldownMessage("recent", availableAt),
      `Next 4-week report available on ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(availableAt)}.`,
    );
    assert.match(reportCooldownMessage("all", availableAt), /^Next all-sessions report available on /);
  });

  it("pauses creation only when the shared balance cannot cover another report", () => {
    assert.equal(reportSpendableUsd({ balance: "0.02" }), 0.02);
    assert.equal(reportSpendableUsd({ balance: "0.00", token_pass: { remaining: "0.02" } }), 0.02);
    assert.equal(reportSpendableUsd({ balance: "1.00", token_pass: null }), 1);
    assert.equal(reportSpendableUsd({ balance: "1.00", token_pass: { remaining: null } }), 1);
    assert.equal(reportSpendableUsd({ balance: "nope" }), null);
    assert.equal(reportAllowancePaused(0.02), false);
    assert.equal(reportAllowancePaused(0.01), false);
    assert.equal(reportAllowancePaused(0.009), true);
    assert.equal(reportAllowancePaused(0), true);
    assert.equal(reportAllowancePaused(null), false);
  });

  it("maps a gateway rejection to a specific message", () => {
    assert.deepEqual(reportGatewayFailure(402), { status: 503, message: REPORT_PAUSED_MESSAGE });
    assert.deepEqual(reportGatewayFailure(429), { status: 503, message: REPORT_BUSY_MESSAGE });
    assert.deepEqual(reportGatewayFailure(401), { status: 503, message: REPORT_UNAVAILABLE_MESSAGE });
    assert.deepEqual(reportGatewayFailure(500), { status: 503, message: REPORT_FAILED_MESSAGE });
  });
});

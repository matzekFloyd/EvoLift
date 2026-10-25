import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  ACCOUNT_JSON_FILENAME,
  AccountTransferError,
  parseAccountTransferJson,
  prepareAccountImport,
  serializeAccountTransfer,
  skippedExercisesMessage,
  type AccountTransfer,
  type ExistingAccountData,
} from "@/lib/account-transfer";
import { accountTransferFromCsvFiles, accountTransferToCsvFiles } from "@/lib/account-transfer-csv";
import { documentFromUploads } from "@/lib/account-transfer-files";
import { unzipStoredFiles, zipStoredFiles } from "@/lib/account-transfer-zip";
import { OPEN_SESSION_LIMIT_MESSAGE } from "@/lib/session-lifecycle";

const TODAY = "2026-10-22";

function sample(): AccountTransfer {
  return {
    format: "evolift-account",
    version: 1,
    profile: {
      bodyweightKg: 80,
      heightCm: 180,
      sex: "male",
      dateOfBirth: "1990-01-02",
    },
    bodyweightLog: [{ loggedOn: "2020-02-02", bodyweightKg: 80 }],
    hiddenExercises: ["back-squat"],
    exerciseDefaults: [
      {
        exercise: "back-squat",
        baseWeightKg: 20,
        targetSets: 3,
        targetReps: 5,
        targetWeightKg: 100,
        suggestWarmups: true,
        suggestTarget: false,
        maxSuggestedWarmupSets: 2,
      },
    ],
    templates: [
      {
        ref: "template-1",
        name: "Squat day",
        notes: "Bar, \"heavy\"",
        exercises: [
          {
            exercise: "back-squat",
            targetSets: 3,
            targetReps: 5,
            targetWeightKg: 100,
            baseWeightKg: 20,
            notes: null,
          },
        ],
      },
    ],
    plans: [
      {
        ref: "plan-1",
        name: "Strength",
        notes: null,
        active: true,
        days: [
          {
            ref: "day-1",
            name: "Day A",
            exercises: [
              {
                exercise: "back-squat",
                targetSets: 3,
                targetReps: 5,
                targetWeightKg: 100,
                baseWeightKg: 20,
                notes: null,
              },
            ],
          },
        ],
      },
    ],
    sessions: [
      {
        ref: "session-1",
        performedOn: "2020-02-02",
        notes: "owner-secret",
        templateRef: "template-1",
        planRef: "plan-1",
        planDayRef: "day-1",
        startedAt: "2020-02-02T10:00:00.000Z",
        completedAt: "2020-02-02T11:00:00.000Z",
        exercises: [
          {
            exercise: "back-squat",
            targetSets: 3,
            targetReps: 5,
            targetWeightKg: 100,
            baseWeightKg: 20,
            notes: null,
            notDone: false,
            sets: [
              {
                setNumber: 1,
                reps: 5,
                loadedKg: 60,
                warmup: true,
                performedAt: "2020-02-02T10:00:00.000Z",
                notes: null,
              },
              {
                setNumber: 2,
                reps: 5,
                loadedKg: 100,
                warmup: false,
                performedAt: "2020-02-02T10:05:00.000Z",
                notes: "belt, \"tight\"",
              },
            ],
          },
        ],
      },
    ],
    goals: [
      {
        exercise: "back-squat",
        type: "absolute",
        targetWeightKg: 140,
        bodyweightMultiple: null,
        minReps: 1,
        dueOn: null,
        note: null,
        achievedAt: null,
        achievedBodyweightKg: null,
        achievedThresholdKg: null,
      },
    ],
  };
}

const emptyExisting = (): ExistingAccountData => ({
  profile: null,
  bodyweightDates: [],
  hiddenExerciseIds: [],
  defaultExerciseIds: [],
  templateNames: [],
  planNames: [],
  hasActivePlan: false,
  openSessionCount: 0,
});

const catalog = new Map([["back-squat", "11111111-1111-4111-8111-111111111111"]]);

describe("account transfer", () => {
  it("round-trips JSON, CSV, and a zip without passwords or tokens", () => {
    const document = sample();
    const json = serializeAccountTransfer(document);
    assert.equal(json.includes("password"), false);
    assert.equal(json.includes("token"), false);
    assert.deepEqual(Object.keys(JSON.parse(json)).sort(), [
      "bodyweightLog",
      "exerciseDefaults",
      "format",
      "goals",
      "hiddenExercises",
      "plans",
      "profile",
      "sessions",
      "templates",
      "version",
    ]);
    assert.deepEqual(parseAccountTransferJson(json, TODAY), document);

    const files = accountTransferToCsvFiles(document);
    assert.equal(files.length, 13);
    const parsed = accountTransferFromCsvFiles(new Map(files.map((file) => [file.name, file.text])), TODAY);
    assert.deepEqual(parsed, document);

    const zipped = zipStoredFiles(
      files.map((file) => ({ name: file.name, bytes: new TextEncoder().encode(file.text) })),
    );
    const fromZip = documentFromUploads([{ name: "evolift-account.csv.zip", bytes: zipped }], TODAY);
    assert.deepEqual(fromZip, document);
    const unzipped = unzipStoredFiles(zipped);
    assert.equal(unzipped.size, 13);
  });

  it("names a wrong or incomplete file and skips unknown exercises", () => {
    assert.throws(
      () => parseAccountTransferJson(`{"format":"other"}`, TODAY),
      (error: unknown) => error instanceof AccountTransferError && error.message === "This file is not an EvoLift account export.",
    );
    const files = new Map(accountTransferToCsvFiles(sample()).map((file) => [file.name, file.text]));
    files.delete("sessions.csv");
    assert.throws(
      () => accountTransferFromCsvFiles(files, TODAY),
      (error: unknown) => error instanceof AccountTransferError && error.message === "The CSV set is missing sessions.csv.",
    );

    const document = sample();
    document.sessions[0]?.exercises.push({
      exercise: "not-a-lift",
      targetSets: null,
      targetReps: 5,
      targetWeightKg: null,
      baseWeightKg: null,
      notes: null,
      notDone: false,
      sets: [],
    });
    document.hiddenExercises.push("not-a-lift");
    const prepared = prepareAccountImport({
      document,
      mode: "replace",
      catalog,
      existing: emptyExisting(),
      today: TODAY,
    });
    assert.deepEqual(prepared.skippedExercises, ["not-a-lift"]);
    assert.equal(skippedExercisesMessage(prepared.skippedExercises), "Skipped exercises that are not in the catalog: not-a-lift.");
    assert.equal(prepared.payload.sessions[0]?.exercises.length, 1);
    assert.equal(prepared.payload.sessions[0]?.exercises[0]?.exercise_id, catalog.get("back-squat"));
    assert.equal(prepared.payload.hidden_exercise_ids.length, 1);
  });

  it("adds beside existing records and replaces only when asked", () => {
    const document = sample();
    const existing: ExistingAccountData = {
      profile: { bodyweightKg: 70, heightCm: 180, sex: null, dateOfBirth: null },
      bodyweightDates: ["2020-02-02"],
      hiddenExerciseIds: [catalog.get("back-squat") ?? ""],
      defaultExerciseIds: [catalog.get("back-squat") ?? ""],
      templateNames: ["Squat day"],
      planNames: [],
      hasActivePlan: true,
      openSessionCount: 0,
    };
    assert.throws(
      () =>
        prepareAccountImport({
          document,
          mode: "add",
          catalog,
          existing,
          today: TODAY,
        }),
      (error: unknown) =>
        error instanceof AccountTransferError &&
        error.message === 'A template named "Squat day" is already in this account.',
    );

    const renamed = sample();
    renamed.templates[0] = { ...renamed.templates[0]!, name: "New squat day" };
    const added = prepareAccountImport({
      document: renamed,
      mode: "add",
      catalog,
      existing,
      today: TODAY,
    });
    assert.equal(added.payload.mode, "add");
    assert.equal(added.payload.bodyweight.length, 0);
    assert.equal(added.payload.hidden_exercise_ids.length, 0);
    assert.equal(added.payload.defaults.length, 0);
    assert.equal(added.payload.plans[0]?.active, false);
    assert.equal(added.payload.profile.write, true);
    assert.equal(added.payload.profile.height_cm, 180);
    assert.equal(added.payload.profile.sex, "male");
    assert.equal(added.payload.sessions.length, 1);

    const replaced = prepareAccountImport({
      document,
      mode: "replace",
      catalog,
      existing,
      today: TODAY,
    });
    assert.equal(replaced.payload.mode, "replace");
    assert.equal(replaced.payload.bodyweight.length, 1);
    assert.equal(replaced.payload.profile.height_cm, 180);
    assert.equal(replaced.payload.profile.bodyweight_kg, 80);
    assert.equal(replaced.payload.plans[0]?.active, true);
    assert.equal(replaced.payload.sessions[0]?.exercises[0]?.sets[0]?.is_warmup, true);
    assert.equal(replaced.payload.sessions[0]?.exercises[0]?.sets[0]?.weight_kg, 60);
  });

  it("refuses a file that would exceed open sessions or points at a missing template", () => {
    const document = sample();
    document.sessions[0] = { ...document.sessions[0]!, completedAt: null };
    assert.throws(
      () =>
        prepareAccountImport({
          document,
          mode: "add",
          catalog,
          existing: { ...emptyExisting(), openSessionCount: 3 },
          today: TODAY,
        }),
      (error: unknown) => error instanceof AccountTransferError && error.message === OPEN_SESSION_LIMIT_MESSAGE,
    );

    const dangling = sample();
    dangling.sessions[0] = { ...dangling.sessions[0]!, templateRef: "missing-template" };
    assert.throws(
      () => parseAccountTransferJson(serializeAccountTransfer(dangling), TODAY),
      (error: unknown) =>
        error instanceof AccountTransferError &&
        error.message === "The session on 2020-02-02 refers to a template that is not in the file.",
    );
    assert.equal(ACCOUNT_JSON_FILENAME, "evolift-account.json");
  });

  it("rejects a plan with more than 7 days", () => {
    const document = sample();
    const day = document.plans[0]?.days[0];
    assert.ok(day);
    document.plans[0] = {
      ...document.plans[0]!,
      days: Array.from({ length: 8 }, (_, index) => ({
        ...day,
        ref: `day-${index + 1}`,
      })),
    };
    assert.throws(
      () => parseAccountTransferJson(serializeAccountTransfer(document), TODAY),
      (error: unknown) =>
        error instanceof AccountTransferError &&
        error.message === 'Plan "Strength" can have at most 7 days.',
    );
  });
});

import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";
import { createEmptyExerciseRow, type ExerciseDraftRow } from "./workout-exercise-draft";
import {
  NEW_SESSION_DRAFT_CHANGED_EVENT,
  NEW_SESSION_DRAFT_STORAGE_PREFIX,
  buildNewSessionDraftPayload,
  formatRelativePastFromIso,
  getNewSessionDraftStorageKey,
  isMeaningfulNewSessionDraft,
  normalizeExerciseRowsForHydrate,
  notifyNewSessionDraftChanged,
  parseNewSessionDraftFromStorage,
} from "./new-session-draft";

const TODAY = "2026-10-14";

function row(overrides: Partial<ExerciseDraftRow> = {}): ExerciseDraftRow {
  return { ...createEmptyExerciseRow(), ...overrides };
}

describe("new session drafts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("scopes the storage key to the user", () => {
    assert.equal(getNewSessionDraftStorageKey("user-1"), `${NEW_SESSION_DRAFT_STORAGE_PREFIX}:user-1`);
  });

  it("returns null for missing or invalid storage", () => {
    assert.equal(parseNewSessionDraftFromStorage(null), null);
    assert.equal(parseNewSessionDraftFromStorage("  "), null);
    assert.equal(parseNewSessionDraftFromStorage("{"), null);
    assert.equal(parseNewSessionDraftFromStorage("[]"), null);
    assert.equal(parseNewSessionDraftFromStorage(JSON.stringify({ performedOn: TODAY })), null);
  });

  it("keeps valid rows and drops values that are not draft rows", () => {
    const parsed = parseNewSessionDraftFromStorage(
      JSON.stringify({
        performedOn: TODAY,
        notes: "heavy",
        updatedAt: "  ",
        exerciseRows: [{ rowId: "row-1", exerciseId: "squat", notes: 12 }, null, "nope"],
      }),
    );
    assert.equal(parsed?.performedOn, TODAY);
    assert.equal(parsed?.notes, "heavy");
    assert.equal(parsed?.updatedAt, undefined);
    assert.equal(parsed?.exerciseRows.length, 1);
    assert.equal(parsed?.exerciseRows[0]?.exerciseId, "squat");
    assert.equal(parsed?.exerciseRows[0]?.notes, "");
  });

  it("treats notes, a chosen exercise, or another day as worth resuming", () => {
    const empty = {
      performedOn: TODAY,
      notes: "",
      exerciseRows: [row()],
    };
    assert.equal(isMeaningfulNewSessionDraft(empty, { todayYyyyMmDd: TODAY }), false);
    assert.equal(isMeaningfulNewSessionDraft({ ...empty, notes: " " }, { todayYyyyMmDd: TODAY }), false);
    assert.equal(isMeaningfulNewSessionDraft({ ...empty, notes: "note" }, { todayYyyyMmDd: TODAY }), true);
    assert.equal(
      isMeaningfulNewSessionDraft(
        { ...empty, exerciseRows: [row({ exerciseId: "squat" })] },
        { todayYyyyMmDd: TODAY },
      ),
      true,
    );
    assert.equal(
      isMeaningfulNewSessionDraft({ ...empty, performedOn: "2026-10-20" }, { todayYyyyMmDd: TODAY }),
      true,
    );
  });

  it("describes a valid edit time and ignores an invalid one", () => {
    assert.equal(formatRelativePastFromIso("not-a-time"), "");
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-14T12:00:00Z"));
    const relative = formatRelativePastFromIso("2026-10-14T10:00:00Z");
    assert.match(relative, /2/);
  });

  it("stamps a payload and keeps at least one row for the form", () => {
    const payload = buildNewSessionDraftPayload(TODAY, "", []);
    assert.equal(payload.performedOn, TODAY);
    assert.equal(Number.isNaN(Date.parse(payload.updatedAt ?? "")), false);
    assert.equal(normalizeExerciseRowsForHydrate([]).length, 1);
    const existing = [row({ exerciseId: "squat" })];
    assert.equal(normalizeExerciseRowsForHydrate(existing), existing);
  });

  it("notifies same-tab listeners when a window exists", () => {
    const types: string[] = [];
    vi.stubGlobal("window", {
      dispatchEvent(event: Event) {
        types.push(event.type);
        return true;
      },
    });
    notifyNewSessionDraftChanged();
    assert.deepEqual(types, [NEW_SESSION_DRAFT_CHANGED_EVENT]);
  });
});

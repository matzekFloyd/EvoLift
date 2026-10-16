import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

vi.mock("@/server/auth/api-request", () => ({
  authenticateApiRequest: async () => ({ error: "Unauthorized", status: 401 }),
}));

import type { InsightsHistory, UserStrengthProfile } from "@/lib/insights-data";
import { buildInsightsPayload } from "./insights-response";

const emptyProfile: UserStrengthProfile = {
  sex: null,
  bodyweightKg: null,
  bodyweightEntries: [],
  dateOfBirth: null,
  birthYear: null,
};

describe("insights payload", () => {
  it("totals the window and starts the moving average on the fourth week", () => {
    const history: InsightsHistory = {
      activity: [
        { date: "2026-09-01", workouts: 1, sets: 4, loadedKg: 100 },
        { date: "2026-09-08", workouts: 1, sets: 4, loadedKg: 200 },
      ],
      weekly: [
        { weekStart: "2026-08-17", volumeKg: 10, workingSets: 1, sessionCount: 1 },
        { weekStart: "2026-08-24", volumeKg: 20, workingSets: 2, sessionCount: 1 },
        { weekStart: "2026-08-31", volumeKg: 30, workingSets: 3, sessionCount: 1 },
        { weekStart: "2026-09-07", volumeKg: 40, workingSets: 4, sessionCount: 1 },
      ],
      exerciseSets: [],
    };
    const payload = buildInsightsPayload({
      query: { range: "all", from: "2026-08-01", to: "2026-10-16" },
      today: new Date(2026, 9, 16),
      history,
      profile: emptyProfile,
    });
    assert.equal(payload.totals.workouts, 2);
    assert.equal(payload.totals.volume_kg, 300);
    assert.equal(payload.weekly[3]?.moving_average_volume_kg, 25);
    assert.equal(payload.weekly[0]?.moving_average_volume_kg, null);
    assert.match(payload.comparison.volume, /100\.0 kg/);
  });
});

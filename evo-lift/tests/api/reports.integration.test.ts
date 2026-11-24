import assert from "node:assert/strict";
import { afterAll, beforeAll, describe, it } from "vitest";
import { GET, POST } from "@/app/api/reports/route";
import { formatDateToYyyyMmDd } from "@/lib/session-date";
import { REPORT_TOO_FEW_SESSIONS_MESSAGE } from "@/lib/training-report";
import {
  adminClient,
  assertLocalSupabase,
  buildRequest,
  createTestUser,
  deleteTestUsers,
  readJson,
} from "./integration-helpers";

assertLocalSupabase();

describe("training reports", () => {
  const admin = adminClient();
  const userIds: string[] = [];
  let ownerToken = "";
  let ownerId = "";
  let otherToken = "";

  beforeAll(async () => {
    const owner = await createTestUser(admin, "evo-report-owner");
    const other = await createTestUser(admin, "evo-report-other");
    userIds.push(owner.id, other.id);
    ownerToken = owner.token;
    ownerId = owner.id;
    otherToken = other.token;
  });

  afterAll(async () => {
    await deleteTestUsers(admin, userIds);
  });

  it("does not call the model when the last 4 weeks have fewer than two sessions", async () => {
    const today = formatDateToYyyyMmDd(new Date());
    const created = await readJson(
      await POST(buildRequest("/api/reports", "POST", ownerToken, { today })),
    );
    assert.equal(created.status, 422);
    assert.equal(created.body.error, REPORT_TOO_FEW_SESSIONS_MESSAGE);
  });

  it("lists only the signed-in lifter's saved reports", async () => {
    const { error } = await admin.from("training_reports").insert({
      user_id: ownerId,
      period_start: "2026-10-01",
      period_end: "2026-10-28",
      model: "test-model",
      report_text: "Owner report. Suggestions come from logged training and are not medical advice.",
    });
    assert.equal(error, null);

    const ownerList = await readJson(await GET(buildRequest("/api/reports", "GET", ownerToken)));
    assert.equal(ownerList.status, 200);
    const ownerRows = ownerList.body.data as Array<{ report_text: string }>;
    assert.equal(ownerRows.length, 1);
    assert.match(ownerRows[0].report_text, /Owner report/);

    const otherList = await readJson(await GET(buildRequest("/api/reports", "GET", otherToken)));
    assert.equal(otherList.status, 200);
    assert.deepEqual(otherList.body.data, []);
  });
});

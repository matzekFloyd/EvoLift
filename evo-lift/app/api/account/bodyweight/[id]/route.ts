import { NextRequest } from "next/server";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import {
  handleApi,
  jsonData,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { parseBodyweightWrite } from "@/server/api/account-body";
import { requireOwnedBodyweightEntryId } from "@/server/db/owned";
import { deleteBodyweightEntry, listBodyweightEntries, updateBodyweightEntry } from "@/server/db/profile";

type EntryParams = { id: string };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<EntryParams> | EntryParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const entryId = await requireOwnedBodyweightEntryId(
      auth.client,
      auth.userId,
      requireUuid(id, "bodyweight id"),
    );
    const existing = await listBodyweightEntries(auth.client, auth.userId);
    const body = await readJsonObject(request);
    const input = parseBodyweightWrite(
      body,
      getTodayYyyyMmDd(),
      existing.filter((entry) => entry.id !== entryId).map((entry) => entry.logged_on),
    );
    return jsonData(await updateBodyweightEntry(auth.client, auth.userId, entryId, input));
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<EntryParams> | EntryParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const entryId = await requireOwnedBodyweightEntryId(
      auth.client,
      auth.userId,
      requireUuid(id, "bodyweight id"),
    );
    await deleteBodyweightEntry(auth.client, auth.userId, entryId);
    return jsonData({ deleted: true });
  });
}

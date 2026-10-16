import { NextRequest } from "next/server";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parseBodyweightWrite } from "@/server/api/account-body";
import { createBodyweightEntry, listBodyweightEntries } from "@/server/db/profile";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    return jsonData(await listBodyweightEntries(auth.client, auth.userId));
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const existing = await listBodyweightEntries(auth.client, auth.userId);
    const input = parseBodyweightWrite(
      body,
      getTodayYyyyMmDd(),
      existing.map((entry) => entry.logged_on),
    );
    const entry = await createBodyweightEntry(auth.client, auth.userId, input);
    return jsonData(entry, 201);
  });
}

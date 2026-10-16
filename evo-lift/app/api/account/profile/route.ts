import { NextRequest } from "next/server";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parseProfileBody } from "@/server/api/account-body";
import { getProfile, saveProfile } from "@/server/db/profile";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    return jsonData(await getProfile(auth.client, auth.userId));
  });
}

export async function PUT(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const today = getTodayYyyyMmDd();
    const profile = await saveProfile(auth.client, auth.userId, parseProfileBody(body, today), today);
    return jsonData(profile);
  });
}

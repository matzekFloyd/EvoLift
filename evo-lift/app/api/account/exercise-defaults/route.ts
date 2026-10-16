import { NextRequest } from "next/server";
import { handleApi, jsonData } from "@/server/api/http";
import { getExerciseDefaults } from "@/server/db/profile";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    return jsonData(await getExerciseDefaults(auth.client, auth.userId));
  });
}

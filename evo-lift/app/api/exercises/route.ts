import { NextRequest } from "next/server";
import type { LanguageCode } from "@/lib/supabase/database.types";
import {
  ApiHttpError,
  handleApi,
  jsonData,
} from "@/server/api/http";
import { listExercisesWithTranslations } from "@/server/db/exercises";

function parseLanguageCode(value: string | null): LanguageCode | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "en" || value === "de") {
    return value;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const lang = parseLanguageCode(request.nextUrl.searchParams.get("lang"));
    if (request.nextUrl.searchParams.get("lang") && !lang) {
      throw new ApiHttpError(400, "Invalid lang value. Use 'en' or 'de'.");
    }

    const exercises = await listExercisesWithTranslations(auth.client, lang);
    return jsonData(exercises);
  });
}

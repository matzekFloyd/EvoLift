import { NextRequest, NextResponse } from "next/server";
import type { LanguageCode } from "@/lib/supabase/database.types";
import { authenticateApiRequest } from "@/server/auth/api-request";
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
  try {
    const auth = await authenticateApiRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const lang = parseLanguageCode(request.nextUrl.searchParams.get("lang"));
    if (request.nextUrl.searchParams.get("lang") && !lang) {
      return NextResponse.json(
        { error: "Invalid lang value. Use 'en' or 'de'." },
        { status: 400 },
      );
    }

    const exercises = await listExercisesWithTranslations(auth.client, lang);

    return NextResponse.json({ data: exercises });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

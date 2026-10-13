import { NextRequest } from "next/server";
import {
  ApiHttpError,
  handleApi,
  jsonData,
  parseOptionalNotes,
  readJsonObject,
} from "@/server/api/http";
import { parseTemplateExerciseList } from "@/server/api/session-body";
import { createTemplate, listTemplates } from "@/server/db/templates";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const templates = await listTemplates(auth.client, auth.userId);
    return jsonData(
      templates.map((template) => ({
        id: template.id,
        name: template.name,
        notes: template.notes,
        created_at: template.created_at,
        updated_at: template.updated_at,
        exercise_count: template.exerciseCount,
      })),
    );
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    if (typeof body.name !== "string") {
      throw new ApiHttpError(400, "Please enter a template name.");
    }
    const notes = parseOptionalNotes(body.notes, "notes");
    const exercises = parseTemplateExerciseList(body.exercises);
    const template = await createTemplate(auth.client, {
      userId: auth.userId,
      name: body.name,
      notes: notes ?? null,
      exercises,
    });
    return jsonData(template, 201);
  });
}

import { NextRequest } from "next/server";
import {
  ApiHttpError,
  handleApi,
  jsonData,
  parseOptionalNotes,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { parseTemplateExerciseList } from "@/server/api/session-body";
import { deleteTemplate, getTemplateById, updateTemplate } from "@/server/db/templates";

type TemplateParams = { id: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<TemplateParams> | TemplateParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const templateId = requireUuid(id, "template id");
    const template = await getTemplateById(auth.client, auth.userId, templateId);
    if (!template) {
      throw new ApiHttpError(404, "Template not found.");
    }
    return jsonData(template);
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<TemplateParams> | TemplateParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const templateId = requireUuid(id, "template id");
    const body = await readJsonObject(request);
    if (typeof body.name !== "string") {
      throw new ApiHttpError(400, "Please enter a template name.");
    }
    const notes = parseOptionalNotes(body.notes, "notes");
    const exercises = parseTemplateExerciseList(body.exercises);
    const template = await updateTemplate(auth.client, auth.userId, templateId, {
      name: body.name,
      notes: notes ?? null,
      exercises,
    });
    return jsonData(template);
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<TemplateParams> | TemplateParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const templateId = requireUuid(id, "template id");
    await deleteTemplate(auth.client, auth.userId, templateId);
    return jsonData({ deleted: true });
  });
}

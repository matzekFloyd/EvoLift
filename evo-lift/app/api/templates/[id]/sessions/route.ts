import { NextRequest } from "next/server";
import {
  handleApi,
  jsonData,
  parseOptionalNotes,
  parseRequiredDate,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { instantiateTemplateSession } from "@/server/db/templates";

type TemplateParams = { id: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<TemplateParams> | TemplateParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const templateId = requireUuid(id, "template id");
    const body = await readJsonObject(request);
    const performedOn = parseRequiredDate(body.performed_on, "performed_on");
    const notes = parseOptionalNotes(body.notes, "notes") ?? null;
    const session = await instantiateTemplateSession(auth.client, {
      userId: auth.userId,
      templateId,
      performedOn,
      notes,
    });
    return jsonData(session, 201);
  });
}

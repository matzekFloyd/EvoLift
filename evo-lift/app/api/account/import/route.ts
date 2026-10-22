import { NextRequest } from "next/server";
import { AccountTransferError } from "@/lib/account-transfer";
import { documentFromUploads } from "@/lib/account-transfer-files";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { ApiHttpError, handleApi, jsonData } from "@/server/api/http";
import { importAccountDocument } from "@/server/db/account-transfer";

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new ApiHttpError(400, "Please choose a JSON file or the CSV set.");
    }
    const form = await request.formData();
    const mode = form.get("mode");
    if (mode !== "add" && mode !== "replace") {
      throw new ApiHttpError(400, "Choose add or replace.");
    }
    const uploads: Array<{ name: string; bytes: Uint8Array }> = [];
    for (const entry of form.getAll("file")) {
      if (!isUpload(entry)) {
        continue;
      }
      uploads.push({ name: entry.name, bytes: new Uint8Array(await entry.arrayBuffer()) });
    }
    let document;
    try {
      document = documentFromUploads(uploads, getTodayYyyyMmDd());
    } catch (error) {
      if (error instanceof AccountTransferError) {
        throw new ApiHttpError(400, error.message);
      }
      throw error;
    }
    return jsonData(await importAccountDocument(auth.client, auth.userId, document, mode));
  });
}

function isUpload(entry: FormDataEntryValue): entry is File {
  return typeof entry === "object" && entry !== null && "arrayBuffer" in entry && "name" in entry;
}

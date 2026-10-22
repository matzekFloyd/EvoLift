import { NextRequest, NextResponse } from "next/server";
import {
  ACCOUNT_CSV_ZIP_FILENAME,
  ACCOUNT_JSON_FILENAME,
  serializeAccountTransfer,
} from "@/lib/account-transfer";
import { blobFromBytes } from "@/lib/account-file-download";
import { accountTransferToCsvFiles } from "@/lib/account-transfer-csv";
import { zipStoredFiles } from "@/lib/account-transfer-zip";
import { ApiHttpError, handleApi } from "@/server/api/http";
import { loadAccountTransfer } from "@/server/db/account-transfer";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const format = request.nextUrl.searchParams.get("format");
    const document = await loadAccountTransfer(auth.client, auth.userId);
    if (format === "json") {
      return fileResponse(
        serializeAccountTransfer(document),
        "application/json; charset=utf-8",
        ACCOUNT_JSON_FILENAME,
      );
    }
    if (format === "csv") {
      const files = accountTransferToCsvFiles(document).map((file) => ({
        name: file.name,
        bytes: new TextEncoder().encode(file.text),
      }));
      return fileResponse(blobFromBytes(zipStoredFiles(files), "application/zip"), "application/zip", ACCOUNT_CSV_ZIP_FILENAME);
    }
    throw new ApiHttpError(400, "Choose JSON or CSV.");
  });
}

function fileResponse(body: BodyInit, mediaType: string, filename: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      "content-type": mediaType,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

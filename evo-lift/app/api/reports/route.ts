import { NextRequest, NextResponse } from "next/server";
import { formatDateToYyyyMmDd } from "@/lib/session-date";
import {
  REPORT_FAILED_MESSAGE,
  REPORT_PAGE_ONLY_MESSAGE,
  reportCreateFromSession,
  reportKindFromBody,
  reportTodayAccepted,
} from "@/lib/training-report";
import { handleApi, jsonData, parseRequiredDate, readJsonObject, ApiHttpError } from "@/server/api/http";
import { createTrainingReport, listTrainingReports } from "@/server/db/training-reports";
import { reportAllowanceIsPaused } from "@/server/reports/gateway";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const [reports, allowancePaused] = await Promise.all([
      listTrainingReports(auth.client, auth.userId),
      reportAllowanceIsPaused(),
    ]);
    return NextResponse.json({ data: reports, allowancePaused });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    if (!reportCreateFromSession(auth.bypassesRls)) {
      throw new ApiHttpError(403, REPORT_PAGE_ONLY_MESSAGE);
    }
    const body = await readJsonObject(request);
    const today = parseRequiredDate(body.today, "date");
    const kind = reportKindFromBody(body.kind);
    if (!kind) {
      throw new ApiHttpError(400, REPORT_FAILED_MESSAGE);
    }
    const serverToday = formatDateToYyyyMmDd(new Date());
    if (!reportTodayAccepted(today, serverToday)) {
      throw new ApiHttpError(400, REPORT_FAILED_MESSAGE);
    }
    const report = await createTrainingReport(auth.client, auth.userId, today, kind);
    return jsonData(report, 201);
  });
}

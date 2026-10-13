import { NextRequest, NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/server/api/openapi-spec";

function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "localhost:3000";
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  return NextResponse.json(buildOpenApiSpec(getBaseUrl(request)));
}

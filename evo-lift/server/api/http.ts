import { NextRequest, NextResponse } from "next/server";
import {
  authenticateApiRequest,
  type ApiRequestAuth,
} from "@/server/auth/api-request";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_SESSION_NOTES_LENGTH = 500;

export class ApiHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

export function jsonData(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function handleApi(
  request: NextRequest,
  handler: (auth: ApiRequestAuth) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const auth = await authenticateApiRequest(request);
    if ("error" in auth) {
      return jsonError(auth.error, auth.status);
    }
    return await handler(auth);
  } catch (error) {
    if (error instanceof ApiHttpError) {
      return jsonError(error.message, error.status);
    }
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return jsonError(message, 500);
  }
}

export async function readRouteParams<T>(params: Promise<T> | T): Promise<T> {
  return await params;
}

export async function readJsonObject(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiHttpError(400, "Request body must be valid JSON.");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiHttpError(400, "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

export function requireUuid(value: string, field: string): string {
  if (!UUID_RE.test(value)) {
    throw new ApiHttpError(400, `Please provide a valid ${field}.`);
  }
  return value;
}

export function parseRequiredDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw new ApiHttpError(400, `Please enter a valid ${field} (YYYY-MM-DD).`);
  }
  return value;
}

export function parseOptionalDateQuery(
  value: string | null,
  field: string,
): string | undefined {
  if (value === null || value === "") {
    return undefined;
  }
  if (!DATE_RE.test(value)) {
    throw new ApiHttpError(400, `Please enter a valid ${field} (YYYY-MM-DD).`);
  }
  return value;
}

export function parseOptionalNotes(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ApiHttpError(400, `${field} must be a string or null.`);
  }
  if (value.length > MAX_SESSION_NOTES_LENGTH) {
    throw new ApiHttpError(
      400,
      `${field} cannot be longer than ${MAX_SESSION_NOTES_LENGTH} characters.`,
    );
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new ApiHttpError(400, `${field} must be a boolean.`);
  }
  return value;
}

export function parseRequiredPositiveInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ApiHttpError(400, `Please enter a valid ${field}.`);
  }
  return value;
}

export function parseOptionalPositiveInt(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ApiHttpError(400, `Please enter a valid ${field}.`);
  }
  return value;
}

export function parseOptionalNonNegativeNumber(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ApiHttpError(400, `Please enter a valid ${field}.`);
  }
  return value;
}

export function parseOptionalUuid(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new ApiHttpError(400, `Please provide a valid ${field}.`);
  }
  return value;
}

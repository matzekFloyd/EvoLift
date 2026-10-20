import { NextRequest } from "next/server";
import { normalizeLoginEmail } from "@/app/login/login-form";
import {
  emailDomainFrom,
  emailFingerprint,
  type SecurityEventType,
} from "@/lib/security-event";
import { ApiHttpError, jsonData, jsonError, readJsonObject } from "@/server/api/http";
import { authenticateApiRequest } from "@/server/auth/api-request";
import { logSecurityEvent } from "@/server/security/log-security-event";

const PUBLIC_TYPES = new Set<SecurityEventType>(["login_failed"]);

const AUTHENTICATED_TYPES = new Set<SecurityEventType>([
  "password_changed",
  "email_change_requested",
  "password_verify_failed",
]);

function readEventType(body: Record<string, unknown>): SecurityEventType {
  if (typeof body.type !== "string") {
    throw new ApiHttpError(400, "Please provide a valid security event type.");
  }
  const type = body.type as SecurityEventType;
  if (!PUBLIC_TYPES.has(type) && !AUTHENTICATED_TYPES.has(type)) {
    throw new ApiHttpError(400, "Please provide a valid security event type.");
  }
  return type;
}

/**
 * Client-reported security events (browser login / account forms).
 * Server-side account and token routes log directly via `logSecurityEvent`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const type = readEventType(body);

    if (PUBLIC_TYPES.has(type)) {
      if (type === "login_failed") {
        const rawEmail = typeof body.email === "string" ? body.email : "";
        const email = normalizeLoginEmail(rawEmail);
        if (!email) {
          throw new ApiHttpError(400, "Please enter a valid email.");
        }
        logSecurityEvent({
          type: "login_failed",
          outcome: "failure",
          emailFingerprint: await emailFingerprint(email),
          emailDomain: emailDomainFrom(email),
        });
      }
      return jsonData({ recorded: true });
    }

    const auth = await authenticateApiRequest(request);
    if ("error" in auth) {
      return jsonError(auth.error, auth.status);
    }

    if (type === "password_changed") {
      logSecurityEvent({
        type: "password_changed",
        outcome: "success",
        userId: auth.userId,
      });
    } else if (type === "email_change_requested") {
      logSecurityEvent({
        type: "email_change_requested",
        outcome: "success",
        userId: auth.userId,
      });
    } else if (type === "password_verify_failed") {
      logSecurityEvent({
        type: "password_verify_failed",
        outcome: "failure",
        userId: auth.userId,
      });
    }

    return jsonData({ recorded: true });
  } catch (error) {
    if (error instanceof ApiHttpError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Could not record the security event.", 500);
  }
}

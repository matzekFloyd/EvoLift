import type { NextRequest } from "next/server";
import { getBearerCredential } from "@/server/auth/api-request";

/** @deprecated Use getBearerCredential or authenticateApiRequest. */
export function getBearerToken(request: NextRequest): string | undefined {
  return getBearerCredential(request);
}

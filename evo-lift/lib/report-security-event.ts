import type { SecurityEventType } from "@/lib/security-event";

/** Best-effort client report; never throws into the UI flow. */
export async function reportSecurityEvent(input: {
  type: SecurityEventType;
  email?: string;
  accessToken?: string;
}): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (input.accessToken) {
      headers.authorization = `Bearer ${input.accessToken}`;
    }
    const body: Record<string, string> = { type: input.type };
    if (input.email) {
      body.email = input.email;
    }
    await fetch("/api/security/events", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Security logging must not block login or account flows.
  }
}

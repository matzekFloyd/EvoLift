import {
  formatSecurityLogLine,
  type SecurityEvent,
} from "@/lib/security-event";

/** Emit one structured security event to stdout (picked up by Vercel logs). */
export function logSecurityEvent(event: SecurityEvent): void {
  console.info(formatSecurityLogLine(event));
}

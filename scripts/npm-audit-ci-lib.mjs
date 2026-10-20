/** Pure helpers for scripts/npm-audit-ci.mjs (unit-tested). */

export function advisoryIdsFromVia(via) {
  const ids = [];
  for (const entry of via ?? []) {
    if (typeof entry === "string") {
      const m = entry.match(/GHSA-[A-Z0-9-]+/i);
      if (m) ids.push(m[0].toUpperCase());
      continue;
    }
    if (entry && typeof entry === "object") {
      if (typeof entry.url === "string") {
        const m = entry.url.match(/GHSA-[A-Z0-9-]+/i);
        if (m) ids.push(m[0].toUpperCase());
      }
      if (typeof entry.source === "number") {
        ids.push(String(entry.source));
      }
      if (typeof entry.source === "string" && /GHSA-/i.test(entry.source)) {
        ids.push(entry.source.toUpperCase());
      }
    }
  }
  return ids;
}

export function collectBlocking(auditJson, allowlist) {
  const blocking = [];
  const vulns = auditJson.vulnerabilities ?? {};
  for (const [name, vuln] of Object.entries(vulns)) {
    if (vuln.severity !== "high" && vuln.severity !== "critical") continue;
    const ids = advisoryIdsFromVia(vuln.via);
    const allAllowed =
      ids.length > 0 && ids.every((id) => allowlist.has(id) || allowlist.has(String(id)));
    if (allAllowed) continue;
    blocking.push({
      name,
      severity: vuln.severity,
      range: vuln.range,
      ids: ids.length > 0 ? ids : ["(no GHSA id in audit output)"],
    });
  }
  return blocking;
}

export function loadAllowlistFromObject(raw) {
  return new Set(
    (raw.advisories ?? []).map((id) => String(id).trim().toUpperCase()).filter(Boolean),
  );
}

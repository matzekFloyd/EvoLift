import { NextRequest, NextResponse } from "next/server";

const PAGES = new Set(["/exercises", "/exercises/[slug]", "/sessions/[id]"]);
const CACHE_STATUSES = new Set(["hit", "miss", "hit-memory", "hit-local"]);
const NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;

function quiet() {
  return new NextResponse(null, { status: 204 });
}

function isQueryMetric(value: unknown): value is { name: string; durationMs: number } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as { name?: unknown; durationMs?: unknown };
  return (
    typeof row.name === "string" &&
    NAME_PATTERN.test(row.name) &&
    typeof row.durationMs === "number" &&
    Number.isFinite(row.durationMs) &&
    row.durationMs >= 0 &&
    row.durationMs <= 120_000
  );
}

function isCacheNote(value: unknown): value is { name: string; status: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as { name?: unknown; status?: unknown };
  return (
    typeof row.name === "string" &&
    NAME_PATTERN.test(row.name) &&
    typeof row.status === "string" &&
    CACHE_STATUSES.has(row.status)
  );
}

/** Accept a sampled page-load summary. Disabled unless the public flag is exactly `1`. */
export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_EVOLIFT_PERF_TELEMETRY !== "1") {
    return quiet();
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 2_000) {
    return NextResponse.json({ error: "Performance sample is too large." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Performance sample must be JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Performance sample must be an object." }, { status: 400 });
  }

  const sample = body as {
    page?: unknown;
    loadDurationMs?: unknown;
    queryCount?: unknown;
    slowest?: unknown;
    cache?: unknown;
  };
  const allowedKeys = new Set(["page", "loadDurationMs", "queryCount", "slowest", "cache"]);
  if (Object.keys(sample).some((key) => !allowedKeys.has(key))) {
    return NextResponse.json({ error: "Performance sample has an unknown field." }, { status: 400 });
  }
  if (typeof sample.page !== "string" || !PAGES.has(sample.page)) {
    return NextResponse.json({ error: "Performance sample has an unknown page." }, { status: 400 });
  }
  if (
    typeof sample.loadDurationMs !== "number" ||
    !Number.isFinite(sample.loadDurationMs) ||
    sample.loadDurationMs < 0 ||
    sample.loadDurationMs > 120_000
  ) {
    return NextResponse.json({ error: "Performance sample has an invalid load duration." }, { status: 400 });
  }
  if (
    typeof sample.queryCount !== "number" ||
    !Number.isInteger(sample.queryCount) ||
    sample.queryCount < 0 ||
    sample.queryCount > 50
  ) {
    return NextResponse.json({ error: "Performance sample has an invalid query count." }, { status: 400 });
  }
  if (!Array.isArray(sample.slowest) || sample.slowest.length > 5 || !sample.slowest.every(isQueryMetric)) {
    return NextResponse.json({ error: "Performance sample has an invalid slowest list." }, { status: 400 });
  }
  if (
    sample.cache !== undefined &&
    (!Array.isArray(sample.cache) || sample.cache.length > 5 || !sample.cache.every(isCacheNote))
  ) {
    return NextResponse.json({ error: "Performance sample has an invalid cache list." }, { status: 400 });
  }

  const slowest = sample.slowest
    .map((row) => `${row.name}: ${row.durationMs}ms`)
    .join(", ");
  const cache = Array.isArray(sample.cache)
    ? sample.cache.map((row) => `${row.name}:${row.status}`).join(", ")
    : "";
  console.info(
    `[Perf] sample page=${sample.page} load=${sample.loadDurationMs}ms queries=${sample.queryCount}${slowest ? ` slowest=${slowest}` : ""}${cache ? ` cache=${cache}` : ""}`,
  );
  return quiet();
}

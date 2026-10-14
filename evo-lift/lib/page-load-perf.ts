type PerfQueryMetric = {
  name: string;
  durationMs: number;
};

export type PerfCacheStatus = "hit" | "miss" | "hit-memory" | "hit-local";

type PerfCacheNote = {
  name: string;
  status: PerfCacheStatus;
};

type PerfFlushResult = {
  page: string;
  loadDurationMs: number;
  queryCount: number;
  queries: PerfQueryMetric[];
  cache?: PerfCacheNote[];
};

type PerfSample = {
  page: string;
  loadDurationMs: number;
  queryCount: number;
  slowest: PerfQueryMetric[];
  cache?: PerfCacheNote[];
};

declare global {
  interface Window {
    __evoLiftPerfMetrics?: PerfFlushResult[];
  }
}

/** Off unless this is exactly `1`. Direct access so Next can inline it in the client bundle. */
const telemetryEnabled = process.env.NEXT_PUBLIC_EVOLIFT_PERF_TELEMETRY === "1";

function readSampleRate(): number {
  if (!telemetryEnabled) {
    return 0;
  }
  const raw = process.env.NEXT_PUBLIC_EVOLIFT_PERF_SAMPLE_RATE;
  if (raw == null || raw.trim() === "") {
    return 0.1;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(1, value);
}

const sampleRate = readSampleRate();

function maybeSendSample(sample: PerfSample) {
  if (sampleRate <= 0 || Math.random() >= sampleRate) {
    return;
  }
  void fetch("/api/perf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sample),
    keepalive: true,
  }).catch(() => {
    // Sampling must not affect the page.
  });
}

export function createPageLoadPerfTracker(page: string) {
  const loadStartedAt = performance.now();
  const queries: PerfQueryMetric[] = [];
  const cacheNotes: PerfCacheNote[] = [];

  async function trackQuery<T>(name: string, run: () => PromiseLike<T> | T): Promise<T> {
    const startedAt = performance.now();
    try {
      return await run();
    } finally {
      queries.push({
        name,
        durationMs: Number((performance.now() - startedAt).toFixed(1)),
      });
    }
  }

  function noteCache(name: string, status: PerfCacheStatus) {
    cacheNotes.push({ name, status });
  }

  function flush() {
    const payload: PerfFlushResult = {
      page,
      loadDurationMs: Number((performance.now() - loadStartedAt).toFixed(1)),
      queryCount: queries.length,
      queries: [...queries],
    };
    if (cacheNotes.length > 0) {
      payload.cache = [...cacheNotes];
    }
    if (typeof window !== "undefined") {
      window.__evoLiftPerfMetrics = window.__evoLiftPerfMetrics ?? [];
      window.__evoLiftPerfMetrics.push(payload);
      const topSlowQueries = [...payload.queries]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 5);
      const slowestText = topSlowQueries.map((row) => `${row.name}: ${row.durationMs}ms`).join(", ");
      const cacheText = payload.cache?.map((note) => `${note.name}:${note.status}`).join(", ");
      console.info(
        `[Perf] ${payload.page} load=${payload.loadDurationMs}ms, queries=${payload.queryCount}${slowestText ? `, slowest=${slowestText}` : ""}${cacheText ? `, cache=${cacheText}` : ""}`,
      );
      if (sampleRate > 0) {
        maybeSendSample({
          page: payload.page,
          loadDurationMs: payload.loadDurationMs,
          queryCount: payload.queryCount,
          slowest: topSlowQueries,
          ...(payload.cache ? { cache: payload.cache } : {}),
        });
      }
    }
    return payload;
  }

  return { trackQuery, noteCache, flush };
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { kpiBadgeTone } from "./kpi-badge-tone";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("kpi badge tone", () => {
  it("keeps counts neutral and strength sky", () => {
    assert.equal(kpiBadgeTone("count"), "neutral");
    assert.equal(kpiBadgeTone("strength"), "sky");
  });

  it("keeps Insights counts neutral and quiets load tiles on exercise detail", () => {
    const insights = readRepo("evo-lift", "app", "(shell)", "app", "insights", "page.tsx");
    const summary = readRepo("evo-lift", "app", "exercises", "[slug]", "exercise-summary-section.tsx");
    const badge = readRepo("evo-lift", "app", "components", "kpi-badge.tsx");

    assert.equal(insights.split('tone={kpiBadgeTone("count")}').length - 1, 3);
    assert.equal(insights.includes('kpiBadgeTone("volume")'), false);
    assert.equal(insights.includes("insightsKpiClassName"), false);
    assert.equal(insights.includes("bg-zinc-50/80"), false);
    assert.equal(insights.includes('tone="neutral"'), false);

    assert.match(summary, /tone=\{kpiBadgeTone\("count"\)\}/);
    assert.equal(summary.includes('kpiBadgeTone("strength")'), false);
    assert.match(summary, /tone="neutral"/);
    assert.match(summary, /valueClassName="text-sm font-medium"/);
    assert.equal(summary.includes('tone="success"'), false);
    assert.equal(summary.includes("text-sky-700"), false);
    assert.equal(summary.includes("text-emerald-700"), false);

    assert.match(badge, /border-sky-300 bg-sky-50/);
    assert.match(badge, /border-emerald-300 bg-emerald-50/);
    assert.match(badge, /border-zinc-300 bg-white/);
  });
});

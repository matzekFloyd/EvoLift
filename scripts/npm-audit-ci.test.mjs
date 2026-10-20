import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advisoryIdsFromVia,
  collectBlocking,
  loadAllowlistFromObject,
} from "./npm-audit-ci-lib.mjs";

describe("npm-audit-ci-lib", () => {
  it("extracts GHSA ids from via entries", () => {
    assert.deepEqual(
      advisoryIdsFromVia([
        {
          source: 123,
          url: "https://github.com/advisories/GHSA-6qxp-vccf-f47h",
        },
        "GHSA-aaaa-bbbb-cccc",
      ]),
      ["GHSA-6QXP-VCCF-F47H", "123", "GHSA-AAAA-BBBB-CCCC"],
    );
  });

  it("loads allowlist ids case-insensitively", () => {
    const set = loadAllowlistFromObject({ advisories: ["ghsa-6qxp-vccf-f47h", "  "] });
    assert.equal(set.size, 1);
    assert.ok(set.has("GHSA-6QXP-VCCF-F47H"));
  });

  it("blocks high production findings that are not allowlisted", () => {
    const report = {
      vulnerabilities: {
        tmp: {
          severity: "high",
          range: "<=0.2.5",
          via: [{ url: "https://github.com/advisories/GHSA-52f5-9888-hmc6" }],
        },
        chalk: { severity: "moderate", via: [] },
      },
    };
    const blocking = collectBlocking(report, new Set());
    assert.equal(blocking.length, 1);
    assert.equal(blocking[0].name, "tmp");
  });

  it("skips allowlisted high findings", () => {
    const report = {
      vulnerabilities: {
        tmp: {
          severity: "high",
          via: [{ url: "https://github.com/advisories/GHSA-52f5-9888-hmc6" }],
        },
      },
    };
    const allow = loadAllowlistFromObject({ advisories: ["GHSA-52f5-9888-hmc6"] });
    assert.equal(collectBlocking(report, allow).length, 0);
  });
});

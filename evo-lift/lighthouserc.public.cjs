/**
 * Lighthouse CI for logged-out pages.
 *
 * `npm run lighthouse` runs this file twice:
 * - performance on `/login` (default)
 * - SEO on `/`, `/login`, `/privacy`, `/terms`, `/legal`, and `/glossary`
 *   (`LHCI_PUBLIC_SUITE=seo`)
 *
 * Authenticated Home and Insights stay in `lighthouserc.app.cjs` and stay
 * performance-only.
 */
const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";
const seoSuite = process.env.LHCI_PUBLIC_SUITE === "seo";

/** Indexable pages. Same list as `PUBLIC_PAGE_PATHS`. */
const PUBLIC_SEO_PATHS = ["/", "/login", "/privacy", "/terms", "/legal", "/glossary"];
const PUBLIC_PERFORMANCE_PATHS = ["/login"];

const paths = seoSuite ? PUBLIC_SEO_PATHS : PUBLIC_PERFORMANCE_PATHS;

module.exports = {
  ci: {
    collect: {
      numberOfRuns: Number(process.env.LHCI_NUMBER_OF_RUNS || 1),
      url: paths.map((path) => new URL(path, baseUrl).href),
      settings: {
        preset: "desktop",
        onlyCategories: [seoSuite ? "seo" : "performance"],
        // Required on GitHub-hosted runners (no usable Chrome sandbox).
        chromeFlags: "--no-sandbox --disable-setuid-sandbox --disable-gpu",
      },
    },
    assert: {
      assertions: seoSuite
        ? {
            "categories:seo": ["error", { minScore: 0.9 }],
          }
        : {
            "categories:performance": ["error", { minScore: 0.7 }],
          },
    },
    upload: {
      target: "filesystem",
      outputDir: seoSuite ? ".lighthouseci/public-seo" : ".lighthouseci/public",
    },
  },
};

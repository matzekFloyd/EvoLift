/** Lighthouse CI: logged-in Home and Insights (local demo user). */
const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";

module.exports = {
  ci: {
    collect: {
      numberOfRuns: Number(process.env.LHCI_NUMBER_OF_RUNS || 1),
      url: [`${baseUrl}/`, `${baseUrl}/insights`],
      puppeteerScript: "./scripts/lighthouse-login.cjs",
      puppeteerLaunchOptions: {
        // chromeFlags in settings are ignored when puppeteerScript is set.
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      },
      settings: {
        preset: "desktop",
        onlyCategories: ["performance"],
        // Keep the session from lighthouse-login across Lighthouse runs.
        disableStorageReset: true,
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: "://[^/]+/?$",
          assertions: {
            "categories:performance": ["error", { minScore: 0.55 }],
          },
        },
        {
          matchingUrlPattern: "/insights",
          assertions: {
            "categories:performance": ["error", { minScore: 0.5 }],
          },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/app",
    },
  },
};

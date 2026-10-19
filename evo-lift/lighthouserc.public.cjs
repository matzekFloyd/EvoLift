/** Lighthouse CI: public login surface (logged out). */
const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";

module.exports = {
  ci: {
    collect: {
      numberOfRuns: Number(process.env.LHCI_NUMBER_OF_RUNS || 1),
      url: [`${baseUrl}/login`],
      settings: {
        preset: "desktop",
        onlyCategories: ["performance"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/public",
    },
  },
};

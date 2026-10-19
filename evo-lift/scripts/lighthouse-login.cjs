/**
 * Logs in as the local demo user before Lighthouse measures Home / Insights.
 * Pair with `settings.disableStorageReset: true` in lighthouserc.app.cjs.
 *
 * @param {import("puppeteer").Browser} browser
 */
module.exports = async (browser) => {
  const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";
  const email = process.env.LHCI_EMAIL || "demo@example.com";
  const password = process.env.LHCI_PASSWORD || "demo1234";

  const page = await browser.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle0", timeout: 60_000 });

  const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
  const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 30_000 });
  if (!emailInput || !passwordInput) {
    throw new Error("Login form fields were not found.");
  }

  await emailInput.click({ clickCount: 3 });
  await emailInput.type(email);
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(password);

  await Promise.all([
    page.waitForFunction(() => !window.location.pathname.startsWith("/login"), {
      timeout: 60_000,
    }),
    page.click('button[type="submit"]'),
  ]);

  await page.close();
};

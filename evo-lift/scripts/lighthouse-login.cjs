/**
 * Logs in as the local demo user before Lighthouse measures Home / Insights.
 * Pair with `settings.disableStorageReset: true` in lighthouserc.app.cjs.
 *
 * LHCI invokes this before every URL in the same Node process. After the first
 * successful login, later calls no-op so a client redirect off `/login` does not
 * race the form selectors.
 *
 * @param {import("puppeteer").Browser} browser
 */
let hasLoggedIn = false;

module.exports = async (browser) => {
  if (hasLoggedIn) {
    return;
  }

  const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";
  const email = process.env.LHCI_EMAIL || "demo@example.com";
  const password = process.env.LHCI_PASSWORD || "demo1234";

  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "load", timeout: 60_000 });

    // Form ready, or already authenticated and redirected away from /login.
    await page.waitForFunction(
      () =>
        Boolean(document.querySelector('input[type="email"]')) ||
        !window.location.pathname.startsWith("/login"),
      { timeout: 30_000 },
    );

    if (!new URL(page.url()).pathname.startsWith("/login")) {
      hasLoggedIn = true;
      return;
    }

    const emailInput = await page.waitForSelector('input[type="email"]', {
      visible: true,
      timeout: 10_000,
    });
    const passwordInput = await page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 10_000,
    });
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

    hasLoggedIn = true;
  } catch (error) {
    const pathname = (() => {
      try {
        return new URL(page.url()).pathname;
      } catch {
        return "(unknown)";
      }
    })();
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Lighthouse login failed on ${pathname}: ${message}`);
  } finally {
    await page.close().catch(() => {});
  }
};

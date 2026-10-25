import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { APP_HOME_PATH, appPath } from "@/lib/app-paths";
import {
  PRODUCT_TOUR_CARD_MARGIN_PX,
  PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX,
  PRODUCT_TOUR_TARGET_IDS,
  isProductTourFinished,
  isProductTourPath,
  markProductTourFinished,
  productTourAccountPath,
  productTourCardBox,
  productTourCenteredCardBox,
  productTourGoalsPath,
  productTourInsightsPath,
  productTourScrollDelta,
  productTourSteps,
  productTourStorageKey,
  shouldStartProductTour,
} from "@/lib/product-tour";

describe("first-login tour", () => {
  it("walks logging, a plan, then Goals and Insights before bodyweight", () => {
    const steps = productTourSteps();
    assert.deepEqual(
      steps.map((step) => step.id),
      ["create-session", "plan", "goals", "insights", "bodyweight", "ready"],
    );
    assert.equal(steps[0]?.title, "Create session");
    assert.equal(steps[0]?.body, "A workout session is one workout. Logging sets happens there.");
    assert.equal(steps[0]?.targetId, PRODUCT_TOUR_TARGET_IDS.createSession);
    assert.equal(steps[0]?.nextPath, null);

    assert.equal(steps[1]?.title, "Plan");
    assert.match(steps[1]?.body ?? "", /ordered cycle of up to 7 days/);
    assert.match(steps[1]?.body ?? "", /One plan can be active/);
    assert.match(steps[1]?.body ?? "", /copies its exercises and targets/);
    assert.equal(steps[1]?.targetId, PRODUCT_TOUR_TARGET_IDS.plan);
    assert.equal(steps[1]?.nextPath, productTourGoalsPath());

    assert.equal(steps[2]?.title, "Goals");
    assert.match(steps[2]?.body ?? "", /multiples of bodyweight/);
    assert.equal(steps[2]?.targetId, PRODUCT_TOUR_TARGET_IDS.goals);
    assert.equal(steps[2]?.nextPath, productTourInsightsPath());
    assert.equal(steps[2]?.prevPath, APP_HOME_PATH);

    assert.equal(steps[3]?.title, "Insights");
    assert.match(steps[3]?.body ?? "", /Lift comparison/);
    assert.match(steps[3]?.body ?? "", /bodyweight, sex, and date of birth/);
    assert.equal(steps[3]?.targetId, PRODUCT_TOUR_TARGET_IDS.insights);
    assert.equal(steps[3]?.nextPath, productTourAccountPath());
    assert.equal(steps[3]?.prevPath, productTourGoalsPath());

    assert.equal(steps[4]?.title, "Bodyweight (kg)");
    assert.match(steps[4]?.body ?? "", /does not change the weights you log/);
    assert.equal(steps[4]?.targetId, PRODUCT_TOUR_TARGET_IDS.bodyweight);
    assert.equal(steps[4]?.prevPath, productTourInsightsPath());
    assert.equal(steps[4]?.nextPath, APP_HOME_PATH);

    assert.equal(steps[5]?.title, "You're set");
    assert.equal(steps[5]?.body, "Create a session when you're ready to log.");
    assert.equal(steps[5]?.targetId, null);
    assert.equal(steps[5]?.nextPath, null);
    assert.equal(steps[5]?.prevPath, productTourAccountPath());
  });

  it("opens Goals, Insights, and Account Profile instead of header links", () => {
    assert.equal(productTourAccountPath(), `${appPath("/account")}?section=profile`);
    assert.equal(productTourGoalsPath(), appPath("/goals"));
    assert.equal(productTourInsightsPath(), appPath("/insights"));
    const selectors = productTourSteps().map((step) => step.targetId);
    assert.deepEqual(selectors, [
      PRODUCT_TOUR_TARGET_IDS.createSession,
      PRODUCT_TOUR_TARGET_IDS.plan,
      PRODUCT_TOUR_TARGET_IDS.goals,
      PRODUCT_TOUR_TARGET_IDS.insights,
      PRODUCT_TOUR_TARGET_IDS.bodyweight,
      null,
    ]);
    for (const id of selectors) {
      if (id) {
        assert.equal(id.startsWith("tour-"), true);
      }
    }
  });

  it("leaves Templates and warmups out of the copy", () => {
    const copy = productTourSteps()
      .map((step) => `${step.title} ${step.body}`)
      .join(" ");
    assert.equal(/template/i.test(copy), false);
    assert.equal(/warmup/i.test(copy), false);
  });

  it("starts on Home once, and stays off session routes", () => {
    assert.equal(
      shouldStartProductTour({ pathname: APP_HOME_PATH, userId: "user-1", finished: false }),
      true,
    );
    assert.equal(
      shouldStartProductTour({ pathname: APP_HOME_PATH, userId: "user-1", finished: true }),
      false,
    );
    assert.equal(
      shouldStartProductTour({ pathname: APP_HOME_PATH, userId: null, finished: false }),
      false,
    );
    assert.equal(
      shouldStartProductTour({ pathname: appPath("/sessions/new"), userId: "user-1", finished: false }),
      false,
    );
    assert.equal(isProductTourPath(APP_HOME_PATH), true);
    assert.equal(isProductTourPath(appPath("/account")), true);
    assert.equal(isProductTourPath(appPath("/goals")), true);
    assert.equal(isProductTourPath(appPath("/insights")), true);
    assert.equal(isProductTourPath(appPath("/sessions/new")), false);
    assert.equal(isProductTourPath(appPath("/plans")), false);
  });

  it("remembers a finished tour per account", () => {
    const saved = new Map<string, string>();
    const store = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    };
    assert.equal(productTourStorageKey("user-1"), "evolift:product-tour:user-1");
    assert.equal(isProductTourFinished(store, "user-1"), false);
    assert.equal(markProductTourFinished(store, "user-1"), true);
    assert.equal(isProductTourFinished(store, "user-1"), true);
    assert.equal(isProductTourFinished(store, "user-2"), false);
  });

  it("does not throw when storage is blocked", () => {
    const store = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(isProductTourFinished(store, "user-1"), false);
    assert.equal(markProductTourFinished(store, "user-1"), false);
  });

  it("uses almost the full phone width, with space at the sides, under the target", () => {
    const box = productTourCardBox({
      viewportWidth: 390,
      targetLeft: 330,
      targetWidth: 40,
      targetBottom: 120,
    });
    assert.equal(box.left, PRODUCT_TOUR_CARD_MARGIN_PX);
    assert.equal(box.width, 390 - PRODUCT_TOUR_CARD_MARGIN_PX * 2);
    assert.equal(box.top, 132);
  });

  it("centers the closing card, nearly full width on a phone", () => {
    const phone = productTourCenteredCardBox({
      viewportWidth: 390,
      viewportHeight: 844,
      cardHeight: 140,
    });
    assert.equal(phone.left, PRODUCT_TOUR_CARD_MARGIN_PX);
    assert.equal(phone.width, 390 - PRODUCT_TOUR_CARD_MARGIN_PX * 2);
    assert.equal(phone.top, (844 - 140) / 2);

    const desktop = productTourCenteredCardBox({
      viewportWidth: 1166,
      viewportHeight: 900,
      cardHeight: 160,
    });
    assert.equal(desktop.width, PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX);
    assert.equal(desktop.left, (1166 - PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX) / 2);
    assert.equal(desktop.top, (900 - 160) / 2);
  });

  it("keeps a desktop card on screen when the target is at the right edge", () => {
    const box = productTourCardBox({
      viewportWidth: 1280,
      targetLeft: 1100,
      targetWidth: 140,
      targetBottom: 80,
    });
    assert.equal(box.width, PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX);
    assert.equal(box.left, 1280 - PRODUCT_TOUR_CARD_MARGIN_PX - PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX);
    assert.ok(box.left >= PRODUCT_TOUR_CARD_MARGIN_PX);
  });

  it("scrolls a low target up far enough for the card, and no farther than the top margin", () => {
    assert.equal(
      productTourScrollDelta({
        viewportHeight: 700,
        targetTop: 520,
        cardTop: 600,
        cardHeight: 200,
      }),
      116,
    );
    assert.equal(
      productTourScrollDelta({
        viewportHeight: 700,
        targetTop: 40,
        cardTop: 620,
        cardHeight: 200,
      }),
      24,
    );
    assert.equal(
      productTourScrollDelta({
        viewportHeight: 800,
        targetTop: 80,
        cardTop: 160,
        cardHeight: 180,
      }),
      0,
    );
  });
});

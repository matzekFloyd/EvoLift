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
  productTourScrollDelta,
  productTourSteps,
  productTourStorageKey,
  shouldStartProductTour,
} from "@/lib/product-tour";

describe("first-login tour", () => {
  it("walks Create session, Plan, then Bodyweight", () => {
    const steps = productTourSteps();
    assert.deepEqual(
      steps.map((step) => step.id),
      ["create-session", "plan", "bodyweight"],
    );
    assert.equal(steps[0]?.title, "Create session");
    assert.equal(steps[0]?.body, "A workout session is one workout. Logging sets happens there.");
    assert.equal(steps[0]?.targetId, PRODUCT_TOUR_TARGET_IDS.createSession);
    assert.equal(steps[0]?.nextPath, null);

    assert.equal(steps[1]?.title, "Plan");
    assert.match(steps[1]?.body ?? "", /ordered cycle of days/);
    assert.match(steps[1]?.body ?? "", /One plan can be active/);
    assert.match(steps[1]?.body ?? "", /copies its exercises and targets/);
    assert.equal(steps[1]?.targetId, PRODUCT_TOUR_TARGET_IDS.plan);
    assert.equal(steps[1]?.nextPath, productTourAccountPath());

    assert.equal(steps[2]?.title, "Bodyweight (kg)");
    assert.match(steps[2]?.body ?? "", /Default goals are already on Goals/);
    assert.match(steps[2]?.body ?? "", /does not change the weights you log/);
    assert.equal(steps[2]?.targetId, PRODUCT_TOUR_TARGET_IDS.bodyweight);
    assert.equal(steps[2]?.prevPath, APP_HOME_PATH);
    assert.equal(steps[2]?.nextPath, null);
  });

  it("opens Account on the Profile tab instead of a header link", () => {
    assert.equal(productTourAccountPath(), `${appPath("/account")}?section=profile`);
    const selectors = productTourSteps().map((step) => step.targetId);
    assert.deepEqual(selectors, [
      PRODUCT_TOUR_TARGET_IDS.createSession,
      PRODUCT_TOUR_TARGET_IDS.plan,
      PRODUCT_TOUR_TARGET_IDS.bodyweight,
    ]);
    for (const id of selectors) {
      assert.equal(id.startsWith("tour-"), true);
    }
  });

  it("leaves Templates, Insights, and warmups out of the copy", () => {
    const copy = productTourSteps()
      .map((step) => `${step.title} ${step.body}`)
      .join(" ");
    assert.equal(/template/i.test(copy), false);
    assert.equal(/insight/i.test(copy), false);
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

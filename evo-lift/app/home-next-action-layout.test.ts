import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  homeCompetingCtaVariant,
  homePlanDayShowsRowAction,
  homePlanDaysStartsOpen,
  homeSessionTableStartsOpen,
} from "./home-next-action-layout";

describe("homeSessionTableStartsOpen", () => {
  it("starts open on desktop and collapsed on compact", () => {
    assert.equal(homeSessionTableStartsOpen(false), true);
    assert.equal(homeSessionTableStartsOpen(true), false);
  });
});

describe("homePlanDaysStartsOpen", () => {
  it("always starts collapsed", () => {
    assert.equal(homePlanDaysStartsOpen(), false);
  });
});

describe("homeCompetingCtaVariant", () => {
  it("demotes competing CTAs when a standalone in-progress strip is showing", () => {
    assert.equal(homeCompetingCtaVariant(true), "secondary");
    assert.equal(homeCompetingCtaVariant(false), "primary");
  });
});

describe("homePlanDayShowsRowAction", () => {
  it("hides the row action when the header already covers that day", () => {
    assert.equal(
      homePlanDayShowsRowAction({ isContinuable: true, isNext: true, hasContinuable: true }),
      false,
    );
    assert.equal(
      homePlanDayShowsRowAction({ isContinuable: false, isNext: true, hasContinuable: false }),
      false,
    );
  });

  it("keeps Start on other days", () => {
    assert.equal(
      homePlanDayShowsRowAction({ isContinuable: false, isNext: false, hasContinuable: true }),
      true,
    );
    assert.equal(
      homePlanDayShowsRowAction({ isContinuable: false, isNext: false, hasContinuable: false }),
      true,
    );
  });
});

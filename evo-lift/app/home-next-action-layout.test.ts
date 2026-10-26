import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  homeCompetingCtaVariant,
  homeDraftIsFocal,
  homeForwardActionClassName,
  homeHeaderAddVariant,
  homeInProgressCtaVariant,
  homePlanDayShowsRowAction,
  homePlanDaysStartsOpen,
  homePlanIsFocal,
  homeSessionTableStartsOpen,
} from "./home-next-action-layout";

describe("homeSessionTableStartsOpen", () => {
  it("starts closed so the chart is the history", () => {
    assert.equal(homeSessionTableStartsOpen(), false);
  });
});

describe("homePlanDaysStartsOpen", () => {
  it("always starts collapsed", () => {
    assert.equal(homePlanDaysStartsOpen(), false);
  });
});

describe("homeForwardActionClassName", () => {
  it("shares one minimum width from sm up, wide enough for Continue session", () => {
    assert.match(homeForwardActionClassName, /sm:min-w-\[10\.75rem\]/);
    assert.match(homeForwardActionClassName, /shrink-0/);
    assert.doesNotMatch(homeForwardActionClassName, /(^|\s)min-w-/);
  });
});

describe("homeCompetingCtaVariant", () => {
  it("demotes competing CTAs when another forward action is already showing", () => {
    assert.equal(homeCompetingCtaVariant(true), "secondary");
    assert.equal(homeCompetingCtaVariant(false), "primary");
  });
});

describe("home forward action", () => {
  it("fills the draft only when no in-progress session is open", () => {
    assert.equal(homeDraftIsFocal(true, false), true);
    assert.equal(homeDraftIsFocal(true, true), false);
    assert.equal(homeDraftIsFocal(false, false), false);
  });

  it("fills the plan action only when the plan offers it and nothing else does", () => {
    assert.equal(
      homePlanIsFocal({
        hasStandaloneInProgress: false,
        draftIsFocal: false,
        planOwnsForwardAction: true,
      }),
      true,
    );
    assert.equal(
      homePlanIsFocal({
        hasStandaloneInProgress: true,
        draftIsFocal: false,
        planOwnsForwardAction: true,
      }),
      false,
    );
    assert.equal(
      homePlanIsFocal({
        hasStandaloneInProgress: false,
        draftIsFocal: true,
        planOwnsForwardAction: true,
      }),
      false,
    );
    assert.equal(
      homePlanIsFocal({
        hasStandaloneInProgress: false,
        draftIsFocal: false,
        planOwnsForwardAction: false,
      }),
      false,
    );
  });

  it("fills Create session only when Home has no other forward action", () => {
    assert.equal(
      homeHeaderAddVariant({
        hasStandaloneInProgress: false,
        draftIsFocal: false,
        planOwnsForwardAction: false,
      }),
      "primary",
    );
    assert.equal(
      homeHeaderAddVariant({
        hasStandaloneInProgress: false,
        draftIsFocal: false,
        planOwnsForwardAction: true,
      }),
      "secondary",
    );
    assert.equal(
      homeHeaderAddVariant({
        hasStandaloneInProgress: true,
        draftIsFocal: false,
        planOwnsForwardAction: false,
      }),
      "secondary",
    );
    assert.equal(
      homeHeaderAddVariant({
        hasStandaloneInProgress: false,
        draftIsFocal: true,
        planOwnsForwardAction: false,
      }),
      "secondary",
    );
  });

  it("fills only the first in-progress Continue", () => {
    assert.equal(homeInProgressCtaVariant(true), "primary");
    assert.equal(homeInProgressCtaVariant(false), "secondary");
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

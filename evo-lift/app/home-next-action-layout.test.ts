import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  homeCompetingCtaVariant,
  homeDraftIsFocal,
  homeForwardActionClassName,
  homeHeaderAddVariant,
  homeInProgressCtaVariant,
  HOME_PLAN_COMPACT_MEDIA_QUERY,
  homePlanDayFinishBeforeStartMessage,
  homePlanDayRowHoverClass,
  homePlanDayRowStartLabel,
  homePlanDayRowStartsSession,
  homePlanDayShowsRowAction,
  homePlanDayStartBlockedMessage,
  homePlanDaysStartsOpen,
  PLAN_DAY_NEEDS_EXERCISE_MESSAGE,
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
  it("hides every row Start button on a phone", () => {
    assert.equal(HOME_PLAN_COMPACT_MEDIA_QUERY, "(max-width: 768px)");
    assert.equal(
      homePlanDayShowsRowAction({
        isCompact: true,
        isContinuable: false,
        isNext: false,
        hasContinuable: false,
      }),
      false,
    );
    assert.equal(
      homePlanDayShowsRowAction({
        isCompact: true,
        isContinuable: false,
        isNext: true,
        hasContinuable: false,
      }),
      false,
    );
  });

  it("hides the row action when the header already covers that day", () => {
    assert.equal(
      homePlanDayShowsRowAction({
        isCompact: false,
        isContinuable: true,
        isNext: true,
        hasContinuable: true,
      }),
      false,
    );
    assert.equal(
      homePlanDayShowsRowAction({
        isCompact: false,
        isContinuable: false,
        isNext: true,
        hasContinuable: false,
      }),
      false,
    );
  });

  it("keeps Start on other days from the compact breakpoint up", () => {
    assert.equal(
      homePlanDayShowsRowAction({
        isCompact: false,
        isContinuable: false,
        isNext: false,
        hasContinuable: true,
      }),
      true,
    );
    assert.equal(
      homePlanDayShowsRowAction({
        isCompact: false,
        isContinuable: false,
        isNext: false,
        hasContinuable: false,
      }),
      true,
    );
  });
});

describe("homePlanDayRowStartsSession", () => {
  it("opens Start session from a phone row that has exercises and no open day", () => {
    assert.equal(
      homePlanDayRowStartsSession({ isCompact: true, exerciseCount: 2, hasContinuable: false }),
      true,
    );
    assert.equal(homePlanDayRowStartLabel("Push"), "Start session from Push");
    assert.match(homePlanDayRowHoverClass(false), /hover:bg-sky-100/);
    assert.match(homePlanDayRowHoverClass(false), /hover:border-sky-300/);
    assert.match(homePlanDayRowHoverClass(true), /hover:bg-sky-200/);
    assert.doesNotMatch(homePlanDayRowHoverClass(true), /hover:bg-sky-100/);
  });

  it("does not start from the row on a wide screen, an empty day, or while a day is open", () => {
    assert.equal(
      homePlanDayRowStartsSession({ isCompact: false, exerciseCount: 2, hasContinuable: false }),
      false,
    );
    assert.equal(
      homePlanDayRowStartsSession({ isCompact: true, exerciseCount: 0, hasContinuable: false }),
      false,
    );
    assert.equal(
      homePlanDayRowStartsSession({ isCompact: true, exerciseCount: 2, hasContinuable: true }),
      false,
    );
  });

  it("keeps the existing reason when a phone row cannot start", () => {
    assert.equal(
      homePlanDayStartBlockedMessage({
        hasContinuable: false,
        exerciseCount: 0,
        continuableDayName: null,
      }),
      PLAN_DAY_NEEDS_EXERCISE_MESSAGE,
    );
    assert.equal(
      homePlanDayStartBlockedMessage({
        hasContinuable: true,
        exerciseCount: 2,
        continuableDayName: "Pull",
      }),
      homePlanDayFinishBeforeStartMessage("Pull"),
    );
    assert.equal(
      homePlanDayStartBlockedMessage({
        hasContinuable: false,
        exerciseCount: 2,
        continuableDayName: null,
      }),
      null,
    );
  });
});
